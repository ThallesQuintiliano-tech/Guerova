<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GoogleAdsOAuth
{
    public function buildAuthUrl(int $accountId, int $userId): string
    {
        $clientId = (string) config('google_ads.client_id');
        $redirectUri = (string) config('google_ads.redirect_uri');
        if (trim($clientId) === '' || trim($redirectUri) === '') {
            throw new RuntimeException('Google Ads OAuth não configurado (client_id/redirect_uri).');
        }

        $state = bin2hex(random_bytes(16));
        Cache::put($this->stateCacheKey($state), [
            'accountId' => $accountId,
            'userId' => $userId,
        ], now()->addMinutes(10));

        $params = [
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'access_type' => 'offline',
            'prompt' => 'consent',
            // Google Ads API scope
            'scope' => 'https://www.googleapis.com/auth/adwords',
            'include_granted_scopes' => 'true',
            'state' => $state,
        ];

        return 'https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query($params);
    }

    /**
     * @return array{accountId:int,userId:int,refresh_token:string,scopes:string|null}
     */
    public function exchangeCode(string $code, string $state): array
    {
        $payload = Cache::pull($this->stateCacheKey($state));
        if (! is_array($payload) || empty($payload['accountId']) || empty($payload['userId'])) {
            throw new RuntimeException('State inválido/expirado. Tente conectar novamente.');
        }

        $clientId = (string) config('google_ads.client_id');
        $clientSecret = (string) config('google_ads.client_secret');
        $redirectUri = (string) config('google_ads.redirect_uri');
        if (trim($clientId) === '' || trim($clientSecret) === '' || trim($redirectUri) === '') {
            throw new RuntimeException('Google Ads OAuth não configurado (client_id/client_secret/redirect_uri).');
        }

        $resp = Http::asForm()
            ->timeout(20)
            ->post('https://oauth2.googleapis.com/token', [
                'code' => $code,
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'redirect_uri' => $redirectUri,
                'grant_type' => 'authorization_code',
            ]);

        if (! $resp->successful()) {
            throw new RuntimeException('Falha ao trocar code por token (HTTP '.$resp->status().').');
        }

        $j = $resp->json();
        $refresh = (string) ($j['refresh_token'] ?? '');
        if ($refresh === '') {
            throw new RuntimeException('Google não retornou refresh_token. Remova o acesso e conecte novamente (prompt=consent).');
        }

        return [
            'accountId' => (int) $payload['accountId'],
            'userId' => (int) $payload['userId'],
            'refresh_token' => $refresh,
            'scopes' => isset($j['scope']) ? (string) $j['scope'] : null,
        ];
    }

    private function stateCacheKey(string $state): string
    {
        return 'google_ads_oauth_state:'.$state;
    }
}
