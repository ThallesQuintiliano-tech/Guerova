<?php

namespace App\Services;

use App\Models\MetaAdsConnection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class MetaAdsOAuth
{
    public function buildAuthUrl(int $accountId, int $userId): string
    {
        return (new FacebookAuthService)->buildAuthUrl('link_meta', $userId, $accountId);
    }

    /**
     * @return array{accountId:int,userId:int,access_token:string,expires_in:int|null}
     */
    public function exchangeCode(string $code, string $state): array
    {
        $payload = Cache::pull($this->stateCacheKey($state));
        if (! is_array($payload) || empty($payload['accountId']) || empty($payload['userId'])) {
            throw new RuntimeException('State inválido/expirado. Tente conectar novamente.');
        }

        $appId = trim((string) config('meta_ads.app_id', ''));
        $appSecret = trim((string) config('meta_ads.app_secret', ''));
        $redirectUri = trim((string) config('meta_ads.redirect_uri', ''));
        if ($appId === '' || $appSecret === '' || $redirectUri === '') {
            throw new RuntimeException('Meta OAuth não configurado (META_APP_ID / META_APP_SECRET / META_ADS_REDIRECT_URI).');
        }

        $version = trim((string) config('meta_ads.graph_version', 'v21.0'));

        $short = $this->http()->get('https://graph.facebook.com/'.$version.'/oauth/access_token', [
            'client_id' => $appId,
            'client_secret' => $appSecret,
            'redirect_uri' => $redirectUri,
            'code' => $code,
        ]);

        if (! $short->successful()) {
            throw new RuntimeException('Falha ao trocar code por token (HTTP '.$short->status().').');
        }

        $shortToken = trim((string) ($short->json('access_token') ?? ''));
        if ($shortToken === '') {
            throw new RuntimeException('Meta não retornou access_token.');
        }

        $long = $this->http()->get('https://graph.facebook.com/'.$version.'/oauth/access_token', [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $appId,
            'client_secret' => $appSecret,
            'fb_exchange_token' => $shortToken,
        ]);

        $accessToken = $shortToken;
        $expiresIn = null;
        if ($long->successful()) {
            $j = $long->json();
            $accessToken = trim((string) ($j['access_token'] ?? $shortToken));
            $expiresIn = isset($j['expires_in']) ? (int) $j['expires_in'] : null;
        }

        return [
            'accountId' => (int) $payload['accountId'],
            'userId' => (int) $payload['userId'],
            'access_token' => $accessToken,
            'expires_in' => $expiresIn,
        ];
    }

    /**
     * Grava conexão por workspace e define ad account se houver apenas uma.
     */
    public function persistConnection(int $accountId, int $userId, string $accessToken): MetaAdsConnection
    {
        $graphVersion = trim((string) config('meta_ads.graph_version', 'v21.0'));
        $client = new MetaAdsClient($accessToken, $graphVersion);
        $this->assertTokenHasAdsPermissions($client);

        $adAccountId = $this->resolveDefaultAdAccountId($client);

        $conn = MetaAdsConnection::query()->updateOrCreate(
            ['account_id' => $accountId],
            [
                'created_by_user_id' => $userId,
                'access_token' => $accessToken,
                'graph_version' => $graphVersion,
                'ad_account_id' => $adAccountId,
            ]
        );

        MetaAdsTokenService::persistExpiry($conn);

        return $conn;
    }

    private function resolveDefaultAdAccountId(MetaAdsClient $client): ?string
    {
        $resp = $client->get('/me/adaccounts', [
            'fields' => 'id,name',
            'limit' => 200,
        ]);
        $items = $resp['data'] ?? [];
        if (! is_array($items) || $items === []) {
            return null;
        }
        if (count($items) === 1 && is_array($items[0])) {
            return trim((string) ($items[0]['id'] ?? '')) ?: null;
        }

        return null;
    }

    private function assertTokenHasAdsPermissions(MetaAdsClient $client): void
    {
        $resp = $client->get('/me/permissions');
        $rows = $resp['data'] ?? [];
        if (! is_array($rows)) {
            throw new RuntimeException('Não foi possível validar permissões do token.');
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

        try {
            $client->get('/me/adaccounts', ['fields' => 'id', 'limit' => 1]);

            return;
        } catch (RuntimeException $e) {
            throw new RuntimeException(
                'O Facebook não concedeu ads_read/ads_management. Ao conectar, aceite as permissões de anúncios.'
                .' '.$e->getMessage()
            );
        }
    }

    private function stateCacheKey(string $state): string
    {
        return 'meta_ads_oauth_state:'.$state;
    }

    private function http(): \Illuminate\Http\Client\PendingRequest
    {
        $request = Http::timeout(30)->acceptJson();
        $ca = config('meta_ads.http_ca_bundle');
        if (is_string($ca) && $ca !== '' && is_file($ca)) {
            return $request->withOptions(['verify' => $ca]);
        }
        if (! (bool) config('meta_ads.http_verify_ssl', true)) {
            return $request->withOptions(['verify' => false]);
        }

        return $request;
    }
}
