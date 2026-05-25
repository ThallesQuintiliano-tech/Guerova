<?php

namespace App\Services;

use App\Models\MetaAdsConnection;

/**
 * Sincroniza META_ADS_ACCESS_TOKEN do .env para meta_ads_connections (fluxo sem OAuth).
 */
class MetaAdsEnvSync
{
    public static function syncForAccount(int $accountId, ?int $userId = null): ?MetaAdsConnection
    {
        if (! (bool) config('meta_ads.prefer_env_token', true)) {
            return null;
        }

        $token = trim((string) env('META_ADS_ACCESS_TOKEN', ''));
        if (strlen($token) < 20) {
            return null;
        }

        $adAccountId = trim((string) env('META_ADS_AD_ACCOUNT_ID', ''));
        $graphVersion = trim((string) config('meta_ads.graph_version', 'v21.0'));

        return MetaAdsConnection::query()->updateOrCreate(
            ['account_id' => $accountId],
            [
                'created_by_user_id' => $userId,
                'access_token' => $token,
                'graph_version' => $graphVersion !== '' ? $graphVersion : null,
                'ad_account_id' => $adAccountId !== '' ? $adAccountId : null,
            ]
        );
    }
}
