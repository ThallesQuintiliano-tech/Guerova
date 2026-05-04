<?php

namespace App\Http\Controllers;

use App\Models\GoogleAdsConnection;
use App\Services\GoogleAdsClientFactory;
use Google\Ads\GoogleAds\Lib\V24\GoogleAdsException;
use Google\Ads\GoogleAds\V24\Services\ListAccessibleCustomersRequest;
use Google\Ads\GoogleAds\V24\Services\SearchGoogleAdsRequest;
use Google\Ads\GoogleAds\V24\Services\GoogleAdsServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Throwable;

class GoogleAdsApiController extends Controller
{
    public function connection(Request $request): JsonResponse
    {
        if (! (bool) config('google_ads.enabled')) {
            return response()->json([
                'ok' => false,
                'paused' => true,
                'error' => 'Integração com Google Ads está pausada no momento.',
            ], 503);
        }

        $account = $request->attributes->get('account');
        $conn = GoogleAdsConnection::query()->where('account_id', $account->id)->first();

        return response()->json([
            'ok' => true,
            'connected' => $conn !== null,
            'customerId' => $conn?->customer_id,
            'developerTokenConfigured' => trim((string) config('google_ads.developer_token')) !== '',
        ]);
    }

    public function accessibleCustomers(Request $request, GoogleAdsClientFactory $factory): JsonResponse
    {
        if (! (bool) config('google_ads.enabled')) {
            return response()->json([
                'ok' => false,
                'paused' => true,
                'error' => 'Integração com Google Ads está pausada no momento.',
            ], 503);
        }

        try {
            $account = $request->attributes->get('account');
            $client = $factory->makeForAccount($account);
            $response = $client->getCustomerServiceClient()->listAccessibleCustomers(
                new ListAccessibleCustomersRequest()
            );

            $names = [];
            foreach ($response->getResourceNames() as $name) {
                $names[] = $name;
            }
            $ids = array_map(static function (string $name): string {
                return str_starts_with($name, 'customers/')
                    ? substr($name, strlen('customers/'))
                    : $name;
            }, $names);

            return response()->json([
                'ok' => true,
                'resourceNames' => $names,
                'customerIds' => $ids,
            ]);
        } catch (Throwable $e) {
            return $this->googleAdsErrorResponse($e);
        }
    }

    public function search(Request $request, GoogleAdsClientFactory $factory): JsonResponse
    {
        if (! (bool) config('google_ads.enabled')) {
            return response()->json([
                'ok' => false,
                'paused' => true,
                'error' => 'Integração com Google Ads está pausada no momento.',
            ], 503);
        }

        try {
            $account = $request->attributes->get('account');
            $conn = GoogleAdsConnection::query()->where('account_id', $account->id)->first();
            if (! $conn) {
                return response()->json(['ok' => false, 'error' => 'Google Ads não conectado para esta conta.'], 400);
            }

            $customerId = $this->resolveAdsCustomerId($request, $factory, $conn);

            if ($customerId === null) {
                return response()->json([
                    'ok' => false,
                    'error' => 'Informe o customer da conta de anúncios: query customerId, conexão (customer_id) ou GOOGLE_ADS_CUSTOMER_ID no .env.',
                ], 400);
            }

            $query = trim((string) $request->query('q', $request->query('query', '')));
            if ($query === '') {
                $query = 'SELECT campaign.id, campaign.name, campaign.status FROM campaign ORDER BY campaign.id LIMIT 50';
            }

            $maxRows = (int) $request->query('limit', 100);
            $maxRows = max(1, min(500, $maxRows));

            $client = $factory->makeForAccount($account);
            $paged = $client->getGoogleAdsServiceClient()->search(
                SearchGoogleAdsRequest::build($customerId, $query)
            );

            $rows = [];
            foreach ($paged->iterateAllElements() as $row) {
                $rows[] = json_decode($row->serializeToJsonString(), true);
                if (count($rows) >= $maxRows) {
                    break;
                }
            }

            return response()->json([
                'ok' => true,
                'customerId' => $customerId,
                'query' => $query,
                'rowCount' => count($rows),
                'rows' => $rows,
            ]);
        } catch (Throwable $e) {
            return $this->googleAdsErrorResponse($e);
        }
    }

    private function googleAdsErrorResponse(Throwable $e): JsonResponse
    {
        if ($e instanceof RuntimeException) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 400);
        }

        if ($e instanceof GoogleAdsException) {
            $details = [];
            foreach ($e->getGoogleAdsFailure()->getErrors() as $err) {
                $details[] = ['message' => $err->getMessage()];
            }

            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
                'googleAdsErrors' => $details,
                'requestId' => $e->getRequestId(),
            ], 502);
        }

        report($e);

        return response()->json([
            'ok' => false,
            'error' => 'Falha ao chamar a Google Ads API.',
        ], 500);
    }

    public function campaigns(Request $request, GoogleAdsClientFactory $factory): JsonResponse
    {
        if (! (bool) config('google_ads.enabled')) {
            return response()->json([
                'ok' => false,
                'paused' => true,
                'error' => 'Integração com Google Ads está pausada no momento.',
            ], 503);
        }

        try {
            $account = $request->attributes->get('account');
            $conn = GoogleAdsConnection::query()->where('account_id', $account->id)->first();
            if (! $conn) {
                return response()->json(['ok' => false, 'error' => 'Google Ads não conectado para esta conta.'], 400);
            }

            $customerId = $this->resolveAdsCustomerId($request, $factory, $conn);
            if ($customerId === null) {
                return response()->json([
                    'ok' => false,
                    'error' => 'Informe o customer da conta de anúncios: query customerId, conexão (customer_id) ou GOOGLE_ADS_CUSTOMER_ID no .env.',
                ], 400);
            }

            $query = <<<'GAQL'
SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type,
  metrics.cost_micros,
  metrics.impressions,
  metrics.clicks,
  metrics.conversions
FROM campaign
WHERE segments.date DURING LAST_7_DAYS
GAQL;

            $client = $factory->makeForAccount($account);
            $rows = $this->collectSearchRows($client->getGoogleAdsServiceClient(), $customerId, $query, 5000);

            $agg = [];
            foreach ($rows as $row) {
                $c = $row['campaign'] ?? [];
                $id = isset($c['id']) ? (string) $c['id'] : '';
                if ($id === '') {
                    continue;
                }
                if (! isset($agg[$id])) {
                    $agg[$id] = [
                        'id' => 'gads-'.$id,
                        'source' => 'google_ads',
                        'campaignId' => $id,
                        'name' => (string) ($c['name'] ?? ''),
                        'platform' => 'Google Ads',
                        'status' => $this->mapAdsCampaignStatus($c['status'] ?? null),
                        'rawStatus' => (string) ($c['status'] ?? ''),
                        'objective' => $this->labelAdvertisingChannel($c['advertisingChannelType'] ?? $c['advertising_channel_type'] ?? null),
                        'dailyBudget' => null,
                        'spend7d' => 0.0,
                        'leads7d' => 0.0,
                        'impressions' => 0.0,
                        'clicks' => 0.0,
                    ];
                }
                $m = $row['metrics'] ?? [];
                $agg[$id]['spend7d'] += $this->metricMicrosToUnits($m, 'costMicros', 'cost_micros');
                $agg[$id]['impressions'] += $this->metricFloat($m, 'impressions');
                $agg[$id]['clicks'] += $this->metricFloat($m, 'clicks');
                $agg[$id]['leads7d'] += $this->metricFloat($m, 'conversions');
            }

            $campaigns = array_values($agg);
            usort($campaigns, static fn (array $a, array $b): int => strcmp((string) $a['name'], (string) $b['name']));

            foreach ($campaigns as &$c) {
                $c['spend7d'] = round($c['spend7d'], 2);
                $c['impressions'] = (int) round($c['impressions']);
                $c['clicks'] = (int) round($c['clicks']);
                $c['leads7d'] = round($c['leads7d'], 2);
                $leads = $c['leads7d'] > 0 ? $c['leads7d'] : 0.0;
                $c['cpl'] = $leads > 0 ? round($c['spend7d'] / $leads, 2) : null;
            }
            unset($c);

            return response()->json([
                'ok' => true,
                'customerId' => $customerId,
                'campaigns' => $campaigns,
            ]);
        } catch (Throwable $e) {
            return $this->googleAdsErrorResponse($e);
        }
    }

    private function resolveAdsCustomerId(Request $request, GoogleAdsClientFactory $factory, GoogleAdsConnection $conn): ?string
    {
        return $factory->parseOptionalCustomerId((string) $request->query('customerId', ''))
            ?? $factory->parseOptionalCustomerId((string) $conn->customer_id)
            ?? $factory->parseOptionalCustomerId((string) config('google_ads.default_customer_id', ''));
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function collectSearchRows(GoogleAdsServiceClient $svc, string $customerId, string $query, int $maxRows): array
    {
        $maxRows = max(1, min(10000, $maxRows));
        $paged = $svc->search(
            SearchGoogleAdsRequest::build($customerId, $query)
        );
        $rows = [];
        foreach ($paged->iterateAllElements() as $row) {
            $decoded = json_decode($row->serializeToJsonString(), true);
            if (is_array($decoded)) {
                $rows[] = $decoded;
            }
            if (count($rows) >= $maxRows) {
                break;
            }
        }

        return $rows;
    }

    private function metricMicrosToUnits(array $metrics, string $camel, string $snake): float
    {
        $raw = $metrics[$camel] ?? $metrics[$snake] ?? 0;

        return (float) $raw / 1_000_000;
    }

    private function metricFloat(array $metrics, string $key): float
    {
        $v = $metrics[$key] ?? $metrics[$this->snakeCase($key)] ?? 0;

        return (float) $v;
    }

    private function snakeCase(string $camel): string
    {
        return strtolower(preg_replace('/([a-z])([A-Z])/', '$1_$2', $camel) ?? $camel);
    }

    private function mapAdsCampaignStatus(mixed $status): string
    {
        $s = strtoupper((string) $status);

        return match ($s) {
            'ENABLED' => 'ACTIVE',
            'PAUSED' => 'PAUSED',
            'REMOVED' => 'REMOVED',
            default => $s !== '' ? $s : 'UNKNOWN',
        };
    }

    private function labelAdvertisingChannel(mixed $type): string
    {
        $t = strtoupper((string) $type);

        return match ($t) {
            'SEARCH' => 'Pesquisa',
            'DISPLAY' => 'Display',
            'VIDEO' => 'Vídeo',
            'SHOPPING' => 'Shopping',
            'MULTI_CHANNEL' => 'Multi-canal',
            'PERFORMANCE_MAX' => 'Performance Max',
            'DISCOVERY' => 'Demanda',
            'DEMAND_GEN' => 'Demanda',
            'LOCAL' => 'Local',
            'SMART' => 'Smart',
            'HOTEL' => 'Hotel',
            default => $t !== '' ? $t : '—',
        };
    }
}
