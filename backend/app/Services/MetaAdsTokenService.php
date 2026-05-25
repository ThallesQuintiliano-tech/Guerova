<?php

namespace App\Services;

use App\Models\MetaAdsConnection;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class MetaAdsTokenService
{
    public const EXPIRED_USER_MESSAGE =
        'Token Meta expirado ou inválido. Gere um novo no Graph API Explorer e atualize META_ADS_ACCESS_TOKEN no .env ou em Configurações.';

    public static function isExpiredErrorMessage(string $message): bool
    {
        $m = strtolower($message);

        return str_contains($m, 'session has expired')
            || str_contains($m, 'error validating access token')
            || str_contains($m, 'access token has expired')
            || str_contains($m, 'token expir');
    }

    /**
     * @return array{is_valid:bool,expires_at:?Carbon,scopes:?list<string>,error:?string}
     */
    public static function inspect(string $accessToken): array
    {
        $accessToken = trim($accessToken);
        if ($accessToken === '') {
            return ['is_valid' => false, 'expires_at' => null, 'scopes' => null, 'error' => 'Token vazio.'];
        }

        $appId = trim((string) config('meta_ads.app_id', ''));
        $appSecret = trim((string) config('meta_ads.app_secret', ''));
        if ($appId === '' || $appSecret === '') {
            return ['is_valid' => true, 'expires_at' => null, 'scopes' => null, 'error' => null];
        }

        $version = trim((string) config('meta_ads.graph_version', 'v21.0'));
        $version = $version !== '' ? $version : 'v21.0';

        $json = self::http()
            ->get('https://graph.facebook.com/'.$version.'/debug_token', [
                'input_token' => $accessToken,
                'access_token' => $appId.'|'.$appSecret,
            ])
            ->json();

        if (! is_array($json)) {
            return ['is_valid' => true, 'expires_at' => null, 'scopes' => null, 'error' => null];
        }

        $data = $json['data'] ?? null;
        if (! is_array($data)) {
            return ['is_valid' => true, 'expires_at' => null, 'scopes' => null, 'error' => null];
        }

        $isValid = (bool) ($data['is_valid'] ?? false);
        $expiresAt = null;
        $expiresAtRaw = $data['expires_at'] ?? null;
        if (is_numeric($expiresAtRaw) && (int) $expiresAtRaw > 0) {
            $expiresAt = Carbon::createFromTimestamp((int) $expiresAtRaw);
        }

        $scopes = $data['scopes'] ?? null;
        $scopeList = null;
        if (is_array($scopes)) {
            $scopeList = [];
            foreach ($scopes as $s) {
                if (is_string($s) && $s !== '') {
                    $scopeList[] = $s;
                }
            }
            if ($scopeList === []) {
                $scopeList = null;
            }
        }

        $err = null;
        $errObj = $data['error'] ?? null;
        if (is_array($errObj)) {
            $err = trim((string) ($errObj['message'] ?? '')) ?: null;
        }
        if (! $isValid && $err === null) {
            $err = 'Token inválido ou expirado.';
        }

        return [
            'is_valid' => $isValid,
            'expires_at' => $expiresAt,
            'scopes' => $scopeList,
            'error' => $err,
        ];
    }

    /**
     * @return array{access_token:string,expires_in:?int}
     */
    public static function refreshLongLived(string $accessToken): array
    {
        $appId = trim((string) config('meta_ads.app_id', ''));
        $appSecret = trim((string) config('meta_ads.app_secret', ''));
        if ($appId === '' || $appSecret === '') {
            throw new RuntimeException('META_APP_ID e META_APP_SECRET são necessários para renovar o token.');
        }

        $version = trim((string) config('meta_ads.graph_version', 'v21.0'));
        $version = $version !== '' ? $version : 'v21.0';

        $res = self::http()->get('https://graph.facebook.com/'.$version.'/oauth/access_token', [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $appId,
            'client_secret' => $appSecret,
            'fb_exchange_token' => trim($accessToken),
        ]);

        if (! $res->successful()) {
            throw new RuntimeException('Falha ao renovar token Meta (HTTP '.$res->status().').');
        }

        $token = trim((string) ($res->json('access_token') ?? ''));
        if ($token === '') {
            throw new RuntimeException('Meta não retornou access_token na renovação.');
        }

        $expiresIn = $res->json('expires_in');

        return [
            'access_token' => $token,
            'expires_in' => is_numeric($expiresIn) ? (int) $expiresIn : null,
        ];
    }

    public static function persistExpiry(MetaAdsConnection $conn, ?int $expiresIn = null, ?Carbon $expiresAt = null): void
    {
        if ($expiresAt === null && $expiresIn !== null && $expiresIn > 0) {
            $expiresAt = now()->addSeconds($expiresIn);
        }

        if ($expiresAt === null) {
            $info = self::inspect((string) $conn->access_token);
            $expiresAt = $info['expires_at'];
        }

        if ($expiresAt !== null) {
            $conn->access_token_expires_at = $expiresAt;
            $conn->save();
        }
    }

    /**
     * Renova token de longa duração se ainda válido e a expirar em breve.
     *
     * @throws RuntimeException se o token já expirou
     */
    public function ensureUsable(MetaAdsConnection $conn): MetaAdsConnection
    {
        $token = (string) $conn->access_token;
        $info = self::inspect($token);

        if (! $info['is_valid']) {
            throw new RuntimeException(self::EXPIRED_USER_MESSAGE);
        }

        $expiresAt = $info['expires_at'] ?? $conn->access_token_expires_at;
        if ($expiresAt instanceof Carbon && $expiresAt->isPast()) {
            throw new RuntimeException(self::EXPIRED_USER_MESSAGE);
        }

        $shouldRefresh = $expiresAt instanceof Carbon && $expiresAt->lte(now()->addDays(14));
        if (! $shouldRefresh) {
            if ($info['expires_at'] !== null && $conn->access_token_expires_at === null) {
                $conn->access_token_expires_at = $info['expires_at'];
                $conn->save();
            }

            return $conn;
        }

        $refreshed = self::refreshLongLived($token);
        $conn->access_token = $refreshed['access_token'];
        self::persistExpiry($conn, $refreshed['expires_in'] ?? null);

        return $conn->fresh() ?? $conn;
    }

    private static function http(): \Illuminate\Http\Client\PendingRequest
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
