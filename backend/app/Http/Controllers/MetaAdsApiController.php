<?php

namespace App\Http\Controllers;

use App\Models\MetaAdsConnection;
use App\Services\MetaAdsClient;
use App\Services\MetaAdsEnvSync;
use App\Services\MetaAdsTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Throwable;

class MetaAdsApiController extends Controller
{
    public function connection(Request $request): JsonResponse
    {
        if (! (bool) config('meta_ads.enabled')) {
            return response()->json([
                'ok' => false,
                'paused' => true,
                'error' => 'Integração com Meta Ads está pausada no momento.',
            ], 503);
        }

        $account = $request->attributes->get('account');
        $user = $request->user();
        MetaAdsEnvSync::syncForAccount((int) $account->id, $user?->id);
        $conn = MetaAdsConnection::query()->where('account_id', $account->id)->first();

        return response()->json([
            'ok' => true,
            'connected' => $conn !== null,
            'oauthEnabled' => (bool) config('meta_ads.oauth_enabled', false),
            'preferEnvToken' => (bool) config('meta_ads.prefer_env_token', true),
            'tokenSource' => (bool) config('meta_ads.prefer_env_token', true) && trim((string) env('META_ADS_ACCESS_TOKEN', '')) !== ''
                ? 'env'
                : 'database',
            'graphVersion' => $conn?->graph_version ?? (string) config('meta_ads.graph_version', 'v21.0'),
            'adAccountId' => $conn?->ad_account_id,
            'pageId' => $conn?->page_id,
            'igUserId' => $conn?->ig_user_id,
            'pixelId' => $conn?->pixel_id,
        ]);
    }

    public function upsertConnection(Request $request): JsonResponse
    {
        if (! (bool) config('meta_ads.enabled')) {
            return response()->json([
                'ok' => false,
                'paused' => true,
                'error' => 'Integração com Meta Ads está pausada no momento.',
            ], 503);
        }

        $account = $request->attributes->get('account');
        $user = $request->user();

        $data = $request->validate([
            'accessToken' => ['required', 'string', 'min:20'],
            'graphVersion' => ['nullable', 'string', 'max:20'],
            'adAccountId' => ['nullable', 'string', 'max:64'],
            'pageId' => ['nullable', 'string', 'max:64'],
            'igUserId' => ['nullable', 'string', 'max:64'],
            'pixelId' => ['nullable', 'string', 'max:64'],
        ]);

        try {
            $client = new MetaAdsClient(
                accessToken: trim((string) $data['accessToken']),
                graphVersion: trim((string) ($data['graphVersion'] ?? '')) ?: (string) config('meta_ads.graph_version', 'v21.0'),
            );

            $this->assertTokenHasAdsPermissions($client);

            $adAccountId = trim((string) ($data['adAccountId'] ?? ''));
            if ($adAccountId !== '') {
                $this->assertAdAccountLinkedToBusiness($client, $adAccountId);
            }

            $conn = MetaAdsConnection::query()->updateOrCreate(
                ['account_id' => $account->id],
                [
                    'created_by_user_id' => $user?->id,
                    'access_token' => trim((string) $data['accessToken']),
                    'graph_version' => trim((string) ($data['graphVersion'] ?? '')) ?: null,
                    'ad_account_id' => $adAccountId !== '' ? $adAccountId : null,
                    'page_id' => trim((string) ($data['pageId'] ?? '')) ?: null,
                    'ig_user_id' => trim((string) ($data['igUserId'] ?? '')) ?: null,
                    'pixel_id' => trim((string) ($data['pixelId'] ?? '')) ?: null,
                ]
            );
            MetaAdsTokenService::persistExpiry($conn);
        } catch (Throwable $e) {
            report($e);
            return response()->json(MetaAdsClient::safeError($e), $e instanceof RuntimeException ? 400 : 500);
        }

        return response()->json([
            'ok' => true,
            'connected' => true,
            'connection' => [
                'graphVersion' => $conn->graph_version ?? (string) config('meta_ads.graph_version', 'v21.0'),
                'adAccountId' => $conn->ad_account_id,
                'pageId' => $conn->page_id,
                'igUserId' => $conn->ig_user_id,
                'pixelId' => $conn->pixel_id,
            ],
        ], 201);
    }

    /**
     * Altera só a ad account activa (mesmo token; útil para alternar entre contas do Gestor).
     */
    public function updateAdAccount(Request $request): JsonResponse
    {
        if (! (bool) config('meta_ads.enabled')) {
            return response()->json([
                'ok' => false,
                'paused' => true,
                'error' => 'Integração com Meta Ads está pausada no momento.',
            ], 503);
        }

        $data = $request->validate([
            'adAccountId' => ['required', 'string', 'max:64'],
        ]);

        try {
            $conn = $this->requireConnection($request);
            $adAccountId = $this->normalizeAct(trim((string) $data['adAccountId']));
            $client = $this->clientFromConnection($conn);
            $this->assertTokenHasAdsPermissions($client);
            $this->assertAdAccountLinkedToBusiness($client, $adAccountId);

            $conn->update(['ad_account_id' => $adAccountId]);

            return response()->json([
                'ok' => true,
                'adAccountId' => $adAccountId,
            ]);
        } catch (Throwable $e) {
            report($e);
            return response()->json(MetaAdsClient::safeError($e), $e instanceof RuntimeException ? 400 : 500);
        }
    }

    public function adAccounts(Request $request): JsonResponse
    {
        if (! (bool) config('meta_ads.enabled')) {
            return response()->json([
                'ok' => false,
                'paused' => true,
                'error' => 'Integração com Meta Ads está pausada no momento.',
            ], 503);
        }

        try {
            $conn = $this->requireConnection($request);
            $client = $this->clientFromConnection($conn);
            $this->assertTokenHasAdsPermissions($client);

            $limit = (int) $request->query('limit', 200);
            $limit = max(1, min(500, $limit));

            $resp = $client->get('/me/adaccounts', [
                // O campo `business` exige scope business_management; sem ele a Meta devolve (#100).
                'fields' => 'id,name,account_id,account_status',
                'limit' => $limit,
            ]);

            $items = $resp['data'] ?? [];
            if (! is_array($items)) {
                $items = [];
            }

            return response()->json([
                'ok' => true,
                'adAccounts' => $items,
            ]);
        } catch (Throwable $e) {
            report($e);
            return response()->json(MetaAdsClient::safeError($e), $e instanceof RuntimeException ? 400 : 500);
        }
    }

    /**
     * Lista ad accounts com um token colado (antes de gravar a conexão).
     */
    public function probeAdAccounts(Request $request): JsonResponse
    {
        if (! (bool) config('meta_ads.enabled')) {
            return response()->json([
                'ok' => false,
                'paused' => true,
                'error' => 'Integração com Meta Ads está pausada no momento.',
            ], 503);
        }

        $data = $request->validate([
            'accessToken' => ['required', 'string', 'min:20'],
            'graphVersion' => ['nullable', 'string', 'max:20'],
        ]);

        try {
            $client = new MetaAdsClient(
                accessToken: trim((string) $data['accessToken']),
                graphVersion: trim((string) ($data['graphVersion'] ?? '')) ?: (string) config('meta_ads.graph_version', 'v21.0'),
            );
            $this->assertTokenHasAdsPermissions($client);

            $limit = (int) $request->query('limit', 100);
            $limit = max(1, min(200, $limit));

            $resp = $client->get('/me/adaccounts', [
                'fields' => 'id,name,account_id,account_status',
                'limit' => $limit,
            ]);

            $items = $resp['data'] ?? [];
            if (! is_array($items)) {
                $items = [];
            }

            return response()->json([
                'ok' => true,
                'adAccounts' => $items,
            ]);
        } catch (Throwable $e) {
            report($e);
            return response()->json(MetaAdsClient::safeError($e), $e instanceof RuntimeException ? 400 : 500);
        }
    }

    /**
     * Faz upload da imagem para a ad account (edge {@code adimages}) e devolve o {@code image_hash}.
     */
    public function uploadAdImage(Request $request): JsonResponse
    {
        if (! (bool) config('meta_ads.enabled')) {
            return response()->json([
                'ok' => false,
                'paused' => true,
                'error' => 'Integração com Meta Ads está pausada no momento.',
            ], 503);
        }

        try {
            $conn = $this->requireConnection($request);
            $adAccountId = $this->requireAdAccountId($request, $conn);
            $client = $this->clientFromConnection($conn);
            $this->assertTokenHasAdsPermissions($client);
            $this->assertAdAccountLinkedToBusiness($client, $adAccountId);

            $request->validate([
                'file' => ['required', 'file', 'max:10240', 'mimes:jpeg,jpg,png,gif,webp'],
            ]);

            $uploaded = $request->file('file');
            if (! $uploaded || ! $uploaded->isValid()) {
                throw new RuntimeException('Arquivo de imagem inválido ou ausente.');
            }

            $path = $uploaded->getRealPath();
            if ($path === false || ! is_readable($path)) {
                throw new RuntimeException('Não foi possível ler o arquivo enviado.');
            }

            $contents = file_get_contents($path);
            if ($contents === false || $contents === '') {
                throw new RuntimeException('Arquivo de imagem vazio.');
            }

            $original = $uploaded->getClientOriginalName();
            $original = $original !== '' ? $original : 'creative.jpg';

            $resp = $client->uploadAdImage($adAccountId, $contents, $original);
            $hash = MetaAdsClient::imageHashFromAdImagesResponse($resp);

            return response()->json([
                'ok' => true,
                'image_hash' => $hash,
                'adAccountId' => $adAccountId,
            ], 201);
        } catch (Throwable $e) {
            report($e);
            return response()->json(MetaAdsClient::safeError($e), $e instanceof RuntimeException ? 400 : 500);
        }
    }

    public function campaigns(Request $request): JsonResponse
    {
        if (! (bool) config('meta_ads.enabled')) {
            return response()->json([
                'ok' => false,
                'paused' => true,
                'error' => 'Integração com Meta Ads está pausada no momento.',
            ], 503);
        }

        try {
            $conn = $this->requireConnection($request);
            $adAccountId = $this->requireAdAccountId($request, $conn);
            $client = $this->clientFromConnection($conn);
            $this->assertTokenHasAdsPermissions($client);
            $this->assertAdAccountLinkedToBusiness($client, $adAccountId);

            $limit = (int) $request->query('limit', 50);
            $limit = max(1, min(200, $limit));
            $act = $this->normalizeAct($adAccountId);

            $account = $client->get('/'.$act, [
                'fields' => 'id,name,account_id,amount_spent,account_status',
            ]);

            $resp = $client->get('/'.$act.'/campaigns', [
                'fields' => 'id,name,status,effective_status,objective,created_time,updated_time',
                'limit' => $limit,
                'summary' => 'total_count',
            ]);

            $tokenUser = null;
            try {
                $me = $client->get('/me', ['fields' => 'id,name']);
                $tokenUser = [
                    'id' => $me['id'] ?? null,
                    'name' => $me['name'] ?? null,
                ];
            } catch (Throwable) {
                // opcional
            }

            return response()->json([
                'ok' => true,
                'adAccountId' => $adAccountId,
                'adAccountName' => $account['name'] ?? null,
                'adAccountNumericId' => $account['account_id'] ?? null,
                'amountSpent' => $account['amount_spent'] ?? null,
                'campaignsTotal' => (int) ($resp['summary']['total_count'] ?? count($resp['data'] ?? [])),
                'tokenUser' => $tokenUser,
                'campaigns' => $resp['data'] ?? [],
            ]);
        } catch (Throwable $e) {
            report($e);
            return response()->json(MetaAdsClient::safeError($e), $e instanceof RuntimeException ? 400 : 500);
        }
    }

    /**
     * Métricas agregadas da campanha (Marketing API — edge {@code insights}).
     *
     * Query: {@code datePreset} (ex. last_7_days, last_30_days), {@code timeIncrement} (1 = por dia),
     * {@code fields} (lista separada por vírgula; opcional).
     */
    public function campaignInsights(Request $request, string $campaignId): JsonResponse
    {
        if (! (bool) config('meta_ads.enabled')) {
            return response()->json([
                'ok' => false,
                'paused' => true,
                'error' => 'Integração com Meta Ads está pausada no momento.',
            ], 503);
        }

        $campaignId = trim($campaignId);
        if ($campaignId === '' || ! preg_match('/^\d+$/', $campaignId)) {
            return response()->json([
                'ok' => false,
                'error' => 'campaignId inválido (esperado id numérico da Meta).',
            ], 422);
        }

        try {
            $conn = $this->requireConnection($request);
            $adAccountId = $this->requireAdAccountId($request, $conn);
            $client = $this->clientFromConnection($conn);
            $this->assertTokenHasAdsPermissions($client);
            $this->assertAdAccountLinkedToBusiness($client, $adAccountId);

            $datePreset = trim((string) $request->query('datePreset', 'last_30d'));
            if ($datePreset === '') {
                $datePreset = 'last_30d';
            }
            $timeIncrement = $request->query('timeIncrement');
            $timeIncrement = $timeIncrement === null || $timeIncrement === ''
                ? null
                : max(1, min(90, (int) $timeIncrement));

            $defaultFields = 'impressions,clicks,spend,reach,frequency,cpm,cpc,ctr,actions,cost_per_action_type';
            $fieldsRaw = trim((string) $request->query('fields', ''));
            $fields = $fieldsRaw !== '' ? $fieldsRaw : $defaultFields;

            $params = [
                'fields' => $fields,
                'date_preset' => $datePreset,
            ];
            if ($timeIncrement !== null) {
                $params['time_increment'] = $timeIncrement;
            }

            $resp = $client->get('/'.$campaignId.'/insights', $params);

            return response()->json([
                'ok' => true,
                'campaignId' => $campaignId,
                'datePreset' => $datePreset,
                'timeIncrement' => $timeIncrement,
                'insights' => $resp['data'] ?? [],
                'paging' => $resp['paging'] ?? null,
            ]);
        } catch (Throwable $e) {
            report($e);
            return response()->json(MetaAdsClient::safeError($e), $e instanceof RuntimeException ? 400 : 500);
        }
    }

    /**
     * Relatório consolidado (visão administrador): percorre TODAS as contas de anúncio
     * acessíveis pelo token e devolve, por conta, as campanhas com as métricas do período.
     *
     * Query: {@code datePreset} (ex. last_7d, last_30d), {@code adAccountIds} (lista act_… separada
     * por vírgula para filtrar; opcional), {@code limit} (contas, máx. 200).
     */
    public function report(Request $request): JsonResponse
    {
        if (! (bool) config('meta_ads.enabled')) {
            return response()->json([
                'ok' => false,
                'paused' => true,
                'error' => 'Integração com Meta Ads está pausada no momento.',
            ], 503);
        }

        try {
            $conn = $this->requireConnection($request);
            $client = $this->clientFromConnection($conn);
            $this->assertTokenHasAdsPermissions($client);

            $datePreset = trim((string) $request->query('datePreset', 'last_30d'));
            if ($datePreset === '') {
                $datePreset = 'last_30d';
            }

            $limit = (int) $request->query('limit', 200);
            $limit = max(1, min(200, $limit));

            $filterRaw = trim((string) $request->query('adAccountIds', ''));
            $filter = [];
            if ($filterRaw !== '') {
                foreach (explode(',', $filterRaw) as $part) {
                    $id = $this->normalizeAct(trim($part));
                    if ($id !== '') {
                        $filter[$id] = true;
                    }
                }
            }

            $accountsResp = $client->get('/me/adaccounts', [
                'fields' => 'id,name,account_id,account_status,currency',
                'limit' => $limit,
            ]);
            $rawAccounts = is_array($accountsResp['data'] ?? null) ? $accountsResp['data'] : [];

            // Tokens de "system user" (e alguns tokens de app) não enumeram /me/adaccounts,
            // mas têm acesso direto às contas atribuídas. Nesse caso, usa as contas
            // explicitamente pedidas (adAccountIds) ou a conta configurada na conexão.
            if ($rawAccounts === []) {
                $fallbackIds = $filter !== []
                    ? array_keys($filter)
                    : array_filter([$this->normalizeAct(trim((string) ($conn->ad_account_id ?? '')))]);

                foreach ($fallbackIds as $fid) {
                    if ($fid === '') {
                        continue;
                    }
                    try {
                        $accResp = $client->get('/'.$fid, [
                            'fields' => 'id,name,account_id,account_status,currency',
                        ]);
                        if (is_array($accResp) && trim((string) ($accResp['id'] ?? '')) !== '') {
                            $rawAccounts[] = $accResp;
                        }
                    } catch (Throwable) {
                        // conta sem acesso direto: ignora silenciosamente
                    }
                }
            }

            $tokenUser = null;
            try {
                $me = $client->get('/me', ['fields' => 'id,name']);
                $tokenUser = ['id' => $me['id'] ?? null, 'name' => $me['name'] ?? null];
            } catch (Throwable) {
                // opcional
            }

            $insightFields = 'campaign_id,impressions,clicks,spend,reach,ctr,cpc,cpm,actions,cost_per_action_type';
            $accounts = [];

            foreach ($rawAccounts as $acc) {
                if (! is_array($acc)) {
                    continue;
                }
                $actId = trim((string) ($acc['id'] ?? ''));
                if ($actId === '') {
                    continue;
                }
                if ($filter !== [] && ! isset($filter[$actId])) {
                    continue;
                }

                $entry = [
                    'id' => $actId,
                    'name' => $acc['name'] ?? null,
                    'accountId' => $acc['account_id'] ?? null,
                    'accountStatus' => $acc['account_status'] ?? null,
                    'currency' => $acc['currency'] ?? null,
                    'campaigns' => [],
                    'error' => null,
                ];

                try {
                    $campaignsResp = $client->get('/'.$actId.'/campaigns', [
                        'fields' => 'id,name,status,effective_status,objective',
                        'limit' => 200,
                    ]);
                    $campaigns = is_array($campaignsResp['data'] ?? null) ? $campaignsResp['data'] : [];

                    $insightsResp = $client->get('/'.$actId.'/insights', [
                        'level' => 'campaign',
                        'date_preset' => $datePreset,
                        'fields' => $insightFields,
                        'limit' => 500,
                    ]);
                    $insightRows = is_array($insightsResp['data'] ?? null) ? $insightsResp['data'] : [];

                    $insightsByCampaign = [];
                    foreach ($insightRows as $row) {
                        if (! is_array($row)) {
                            continue;
                        }
                        $cid = trim((string) ($row['campaign_id'] ?? ''));
                        if ($cid !== '') {
                            $insightsByCampaign[$cid] = $row;
                        }
                    }

                    foreach ($campaigns as $c) {
                        if (! is_array($c)) {
                            continue;
                        }
                        $cid = trim((string) ($c['id'] ?? ''));
                        $entry['campaigns'][] = [
                            'id' => $cid,
                            'name' => $c['name'] ?? null,
                            'status' => $c['status'] ?? null,
                            'effective_status' => $c['effective_status'] ?? null,
                            'objective' => $c['objective'] ?? null,
                            'insights' => $cid !== '' ? ($insightsByCampaign[$cid] ?? null) : null,
                        ];
                    }
                } catch (Throwable $e) {
                    $entry['error'] = MetaAdsClient::safeError($e)['error'] ?? $e->getMessage();
                }

                $accounts[] = $entry;
            }

            return response()->json([
                'ok' => true,
                'datePreset' => $datePreset,
                'tokenUser' => $tokenUser,
                'accountsTotal' => count($accounts),
                'accounts' => $accounts,
            ]);
        } catch (Throwable $e) {
            report($e);

            return response()->json(MetaAdsClient::safeError($e), $e instanceof RuntimeException ? 400 : 500);
        }
    }

    /**
     * Lista os anúncios (nível ad) de uma campanha com as métricas do período.
     *
     * Query: {@code datePreset} (ex. last_30d, maximum), {@code adAccountId} (opcional).
     */
    public function campaignAds(Request $request, string $campaignId): JsonResponse
    {
        if (! (bool) config('meta_ads.enabled')) {
            return response()->json([
                'ok' => false,
                'paused' => true,
                'error' => 'Integração com Meta Ads está pausada no momento.',
            ], 503);
        }

        $campaignId = trim($campaignId);
        if ($campaignId === '' || ! preg_match('/^\d+$/', $campaignId)) {
            return response()->json([
                'ok' => false,
                'error' => 'campaignId inválido (esperado id numérico da Meta).',
            ], 422);
        }

        try {
            $conn = $this->requireConnection($request);
            $client = $this->clientFromConnection($conn);

            $datePreset = trim((string) $request->query('datePreset', 'last_30d'));
            if ($datePreset === '') {
                $datePreset = 'last_30d';
            }

            $adsResp = $client->get('/'.$campaignId.'/ads', [
                'fields' => 'id,name,status,effective_status,adset_id',
                'limit' => 200,
            ]);
            $ads = is_array($adsResp['data'] ?? null) ? $adsResp['data'] : [];

            $insightsResp = $client->get('/'.$campaignId.'/insights', [
                'level' => 'ad',
                'date_preset' => $datePreset,
                'fields' => 'ad_id,impressions,clicks,spend,reach,ctr,cpc,cpm,actions,cost_per_action_type',
                'limit' => 500,
            ]);
            $insightRows = is_array($insightsResp['data'] ?? null) ? $insightsResp['data'] : [];

            $insightsByAd = [];
            foreach ($insightRows as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $adId = trim((string) ($row['ad_id'] ?? ''));
                if ($adId !== '') {
                    $insightsByAd[$adId] = $row;
                }
            }

            // Orçamento: vive no conjunto de anúncios (ou na campanha, se for CBO).
            $adsetsResp = $client->get('/'.$campaignId.'/adsets', [
                'fields' => 'id,daily_budget,lifetime_budget',
                'limit' => 200,
            ]);
            $adsetRows = is_array($adsetsResp['data'] ?? null) ? $adsetsResp['data'] : [];
            $budgetByAdset = [];
            foreach ($adsetRows as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $adsetId = trim((string) ($row['id'] ?? ''));
                if ($adsetId !== '') {
                    $budgetByAdset[$adsetId] = $this->parseBudget($row, 'adset');
                }
            }

            $campaignBudget = null;
            try {
                $campResp = $client->get('/'.$campaignId, [
                    'fields' => 'daily_budget,lifetime_budget',
                ]);
                $campaignBudget = is_array($campResp) ? $this->parseBudget($campResp, 'campaign') : null;
            } catch (Throwable) {
                // sem orçamento de campanha (CBO desligado)
            }

            $out = [];
            foreach ($ads as $a) {
                if (! is_array($a)) {
                    continue;
                }
                $adId = trim((string) ($a['id'] ?? ''));
                $adsetId = trim((string) ($a['adset_id'] ?? ''));
                $budget = ($adsetId !== '' ? ($budgetByAdset[$adsetId] ?? null) : null) ?? $campaignBudget;
                $out[] = [
                    'id' => $adId,
                    'name' => $a['name'] ?? null,
                    'status' => $a['status'] ?? null,
                    'effective_status' => $a['effective_status'] ?? null,
                    'budget' => $budget,
                    'insights' => $adId !== '' ? ($insightsByAd[$adId] ?? null) : null,
                ];
            }

            return response()->json([
                'ok' => true,
                'campaignId' => $campaignId,
                'datePreset' => $datePreset,
                'adsTotal' => count($out),
                'ads' => $out,
            ]);
        } catch (Throwable $e) {
            report($e);

            return response()->json(MetaAdsClient::safeError($e), $e instanceof RuntimeException ? 400 : 500);
        }
    }

    /**
     * Cria campanha + adset + creative + ad na Meta.
     * Requer: token + ad account + page id (para creative).
     */
    public function publish(Request $request): JsonResponse
    {
        if (! (bool) config('meta_ads.enabled')) {
            return response()->json([
                'ok' => false,
                'paused' => true,
                'error' => 'Integração com Meta Ads está pausada no momento.',
            ], 503);
        }

        try {
            $conn = $this->requireConnection($request);
            $adAccountId = $this->requireAdAccountId($request, $conn);
            $client = $this->clientFromConnection($conn);
            $this->assertTokenHasAdsPermissions($client);
            $this->assertAdAccountLinkedToBusiness($client, $adAccountId);

            $data = $request->validate([
                'campaign' => ['required', 'array'],
                'campaign.name' => ['required', 'string', 'max:190'],
                'campaign.objective' => ['required', 'string', 'max:50'],
                'campaign.status' => ['nullable', 'string', 'max:30'], // PAUSED | ACTIVE
                'campaign.special_ad_categories' => ['nullable', 'array'],

                'adset' => ['required', 'array'],
                'adset.name' => ['required', 'string', 'max:190'],
                'adset.daily_budget' => ['required', 'integer', 'min:100'], // em centavos (BRL) por padrão
                'adset.billing_event' => ['nullable', 'string', 'max:50'],
                'adset.optimization_goal' => ['nullable', 'string', 'max:50'],
                'adset.bid_strategy' => ['nullable', 'string', 'max:50'],
                'adset.status' => ['nullable', 'string', 'max:30'],
                'adset.targeting' => ['required', 'array'],
                'adset.promoted_object' => ['nullable', 'array'],

                'creative' => ['required', 'array'],
                'creative.name' => ['nullable', 'string', 'max:190'],
                'creative.page_id' => ['nullable', 'string', 'max:64'],
                'creative.ig_user_id' => ['nullable', 'string', 'max:64'],
                'creative.message' => ['required', 'string', 'max:5000'],
                'creative.link' => ['required', 'url', 'max:2048'],
                'creative.headline' => ['nullable', 'string', 'max:255'],
                'creative.description' => ['nullable', 'string', 'max:255'],
                'creative.call_to_action_type' => ['nullable', 'string', 'max:100'],
                'creative.image_hash' => ['required', 'string', 'max:255'],

                'ad' => ['required', 'array'],
                'ad.name' => ['required', 'string', 'max:190'],
                'ad.status' => ['nullable', 'string', 'max:30'],
            ]);

            $pageId = $data['creative']['page_id'] ?? $conn->page_id;
            if (! $pageId) {
                throw new RuntimeException('Configure pageId na conexão ou envie creative.page_id.');
            }

            $igUserId = $data['creative']['ig_user_id'] ?? $conn->ig_user_id;
            $campaignStatus = strtoupper((string) ($data['campaign']['status'] ?? 'PAUSED'));
            $adsetStatus = strtoupper((string) ($data['adset']['status'] ?? 'PAUSED'));
            $adStatus = strtoupper((string) ($data['ad']['status'] ?? 'PAUSED'));

            $campaign = $client->createCampaign($adAccountId, [
                'name' => $data['campaign']['name'],
                'objective' => strtoupper((string) $data['campaign']['objective']),
                'status' => $campaignStatus,
                'special_ad_categories' => json_encode($data['campaign']['special_ad_categories'] ?? []),
            ]);
            $campaignId = (string) ($campaign['id'] ?? '');
            if ($campaignId === '') {
                throw new RuntimeException('Falha ao criar campaign (id vazio).');
            }

            $adsetPayload = [
                'name' => $data['adset']['name'],
                'campaign_id' => $campaignId,
                'daily_budget' => (int) $data['adset']['daily_budget'],
                'status' => $adsetStatus,
                'targeting' => json_encode($data['adset']['targeting']),
            ];
            if (! empty($data['adset']['billing_event'])) {
                $adsetPayload['billing_event'] = strtoupper((string) $data['adset']['billing_event']);
            }
            if (! empty($data['adset']['optimization_goal'])) {
                $adsetPayload['optimization_goal'] = strtoupper((string) $data['adset']['optimization_goal']);
            }
            if (! empty($data['adset']['bid_strategy'])) {
                $adsetPayload['bid_strategy'] = strtoupper((string) $data['adset']['bid_strategy']);
            }
            if (! empty($data['adset']['promoted_object'])) {
                $adsetPayload['promoted_object'] = json_encode($data['adset']['promoted_object']);
            }

            $adset = $client->createAdSet($adAccountId, $adsetPayload);
            $adsetId = (string) ($adset['id'] ?? '');
            if ($adsetId === '') {
                throw new RuntimeException('Falha ao criar adset (id vazio).');
            }

            $linkData = [
                'link' => $data['creative']['link'],
                'message' => $data['creative']['message'],
                'image_hash' => $data['creative']['image_hash'],
            ];
            if (! empty($data['creative']['headline'])) {
                $linkData['name'] = $data['creative']['headline'];
            }
            if (! empty($data['creative']['description'])) {
                $linkData['description'] = $data['creative']['description'];
            }
            if (! empty($data['creative']['call_to_action_type'])) {
                $linkData['call_to_action'] = [
                    'type' => strtoupper((string) $data['creative']['call_to_action_type']),
                ];
            }

            $objectStorySpec = [
                'page_id' => (string) $pageId,
                'link_data' => $linkData,
            ];
            if ($igUserId) {
                $objectStorySpec['instagram_actor_id'] = (string) $igUserId;
            }

            $creative = $client->createCreative($adAccountId, [
                'name' => $data['creative']['name'] ?? $data['campaign']['name'].' - Creative',
                'object_story_spec' => json_encode($objectStorySpec),
            ]);
            $creativeId = (string) ($creative['id'] ?? '');
            if ($creativeId === '') {
                throw new RuntimeException('Falha ao criar creative (id vazio).');
            }

            $ad = $client->createAd($adAccountId, [
                'name' => $data['ad']['name'],
                'adset_id' => $adsetId,
                'creative' => json_encode(['creative_id' => $creativeId]),
                'status' => $adStatus,
            ]);
            $adId = (string) ($ad['id'] ?? '');
            if ($adId === '') {
                throw new RuntimeException('Falha ao criar ad (id vazio).');
            }

            return response()->json([
                'ok' => true,
                'adAccountId' => $adAccountId,
                'ids' => [
                    'campaign_id' => $campaignId,
                    'adset_id' => $adsetId,
                    'creative_id' => $creativeId,
                    'ad_id' => $adId,
                ],
            ], 201);
        } catch (Throwable $e) {
            report($e);
            return response()->json(MetaAdsClient::safeError($e), $e instanceof RuntimeException ? 400 : 500);
        }
    }

    private function requireConnection(Request $request): MetaAdsConnection
    {
        $account = $request->attributes->get('account');
        $user = $request->user();
        MetaAdsEnvSync::syncForAccount((int) $account->id, $user?->id);
        $conn = MetaAdsConnection::query()->where('account_id', $account->id)->first();
        if (! $conn) {
            throw new RuntimeException(
                'Meta Ads não configurado. Defina META_ADS_ACCESS_TOKEN e META_ADS_AD_ACCOUNT_ID no .env ou cole o token em Configurações.'
            );
        }

        return $conn;
    }

    private function clientFromConnection(MetaAdsConnection $conn): MetaAdsClient
    {
        $version = trim((string) ($conn->graph_version ?? '')) ?: (string) config('meta_ads.graph_version', 'v21.0');

        return new MetaAdsClient(
            accessToken: (string) $conn->access_token,
            graphVersion: $version,
        );
    }

    private function requireAdAccountId(Request $request, MetaAdsConnection $conn): string
    {
        $q = trim((string) $request->query('adAccountId', ''));
        if ($q === '') {
            $q = trim((string) $request->input('adAccountId', ''));
        }
        $id = $q !== '' ? $q : (string) ($conn->ad_account_id ?? '');
        $id = trim($id);
        if ($id === '') {
            throw new RuntimeException('Informe o ad account: query adAccountId ou configure na conexão (adAccountId).');
        }

        return $id;
    }

    /**
     * Converte daily_budget/lifetime_budget (centavos, string) num orçamento legível.
     *
     * @param  array<string, mixed>  $row
     * @return array{amount:float,type:string,source:string}|null
     */
    private function parseBudget(array $row, string $source): ?array
    {
        $daily = $row['daily_budget'] ?? null;
        if (is_numeric($daily) && (int) $daily > 0) {
            return ['amount' => ((int) $daily) / 100, 'type' => 'daily', 'source' => $source];
        }

        $lifetime = $row['lifetime_budget'] ?? null;
        if (is_numeric($lifetime) && (int) $lifetime > 0) {
            return ['amount' => ((int) $lifetime) / 100, 'type' => 'lifetime', 'source' => $source];
        }

        return null;
    }

    private function normalizeAct(string $adAccountId): string
    {
        $id = trim($adAccountId);
        if ($id === '') {
            return $id;
        }
        return str_starts_with($id, 'act_') ? $id : 'act_'.$id;
    }

    private function assertTokenHasAdsPermissions(MetaAdsClient $client): void
    {
        $resp = $client->get('/me/permissions');
        $rows = $resp['data'] ?? [];
        if (! is_array($rows)) {
            throw new RuntimeException('Não foi possível validar permissões do token (resposta inesperada).');
        }

        $granted = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $perm = strtolower((string) ($row['permission'] ?? ''));
            $status = strtolower((string) ($row['status'] ?? ''));
            if ($perm !== '' && $status === 'granted') {
                $granted[$perm] = true;
            }
        }

        if (isset($granted['ads_management']) || isset($granted['ads_read'])) {
            return;
        }

        // Alguns tokens (ex. utilizador do Business / fluxos fora do Login clássico) funcionam na Marketing API
        // mas /me/permissions não lista ads_* — prova: leitura de ad accounts.
        try {
            $client->get('/me/adaccounts', [
                'fields' => 'id',
                'limit' => 1,
            ]);

            return;
        } catch (RuntimeException $probe) {
            $scopes = MetaAdsClient::inferScopesViaDebugToken($client->getAccessToken());
            $scopesHint = $scopes !== null
                ? ' Scopes deste token: '.implode(', ', $scopes).'.'
                : ' (Opcional: META_APP_ID + META_APP_SECRET no .env para listar scopes.)';

            throw new RuntimeException(
                'O token não tem permissão para anúncios — são necessários ads_read ou ads_management na app.'
                .$scopesHint
                .' O que fazer: gerar um novo token (ex. Graph API Explorer) com ads_read, mesma app, utilizador com acesso à ad account.'
                .' '.$probe->getMessage()
            );
        }
    }

    private function assertAdAccountLinkedToBusiness(MetaAdsClient $client, string $adAccountId): void
    {
        $act = $this->normalizeAct($adAccountId);

        try {
            $resp = $client->get('/'.$act, [
                'fields' => 'id,name,account_id,business{id,name}',
            ]);
        } catch (RuntimeException $e) {
            if (! str_contains(strtolower($e->getMessage()), 'business_management')) {
                throw $e;
            }
            // Sem scope business_management a Meta não devolve `business`; valida só leitura da ad account.
            $resp = $client->get('/'.$act, [
                'fields' => 'id,name,account_id',
            ]);
            $id = is_array($resp) ? trim((string) ($resp['id'] ?? '')) : '';
            if ($id === '') {
                throw $e;
            }

            return;
        }

        $business = is_array($resp) ? ($resp['business'] ?? null) : null;
        $bizId = is_array($business) ? trim((string) ($business['id'] ?? '')) : '';
        if ($bizId === '') {
            throw new RuntimeException('A conta de anúncio precisa estar vinculada a um Business. Verifique o adAccountId e o Business Manager.');
        }
    }
}

