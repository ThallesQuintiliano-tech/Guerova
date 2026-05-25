<?php

namespace App\Services;

use App\Models\Account;
use App\Models\MetaAdsConnection;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Modelo A: um OAuth Facebook (perfil + ads) para login Guerova e ligação Meta Ads.
 */
class FacebookAuthService
{
    /**
     * @param  array{accountId?:int|null,redirect?:string}  $opts
     */
    public function buildAuthUrl(string $flow, int $userId = 0, int $accountId = 0, array $opts = []): string
    {
        $appId = trim((string) config('meta_ads.app_id', ''));
        $redirectUri = trim((string) config('meta_ads.redirect_uri', ''));
        if ($appId === '' || $redirectUri === '') {
            throw new RuntimeException('Facebook OAuth não configurado (META_APP_ID / META_ADS_REDIRECT_URI).');
        }

        $state = bin2hex(random_bytes(16));
        Cache::put($this->stateKey($state), [
            'flow' => $flow,
            'userId' => $userId,
            'accountId' => $accountId,
            'redirect' => trim((string) ($opts['redirect'] ?? '')),
        ], now()->addMinutes(10));

        $version = trim((string) config('meta_ads.graph_version', 'v21.0'));
        $scopes = trim((string) config('meta_ads.oauth_scopes', 'email,public_profile,ads_read,ads_management'));

        return 'https://www.facebook.com/'.$version.'/dialog/oauth?'.http_build_query([
            'client_id' => $appId,
            'redirect_uri' => $redirectUri,
            'state' => $state,
            'scope' => $scopes,
            'response_type' => 'code',
        ]);
    }

    /**
     * Login (Modelo A): utilizador + token Sanctum + Meta Ads no workspace activo.
     *
     * @return array{handoff:string}
     */
    public function completeLogin(string $code, string $state): array
    {
        $payload = $this->pullState($state);
        if (($payload['flow'] ?? '') !== 'login') {
            throw new RuntimeException('State inválido para login.');
        }

        $accessToken = $this->exchangeForLongLivedToken($code);
        $profile = $this->fetchProfile($accessToken);
        $user = $this->findOrCreateUser($profile);
        $account = $this->resolveAccountForUser($user, (int) ($payload['accountId'] ?? 0));

        $this->persistMetaConnection((int) $account->id, (int) $user->id, $accessToken);

        $sanctum = $user->createToken('facebook-web');
        $accounts = $this->formatAccounts($user);

        $handoff = bin2hex(random_bytes(20));
        Cache::put($this->handoffKey($handoff), [
            'token' => $sanctum->plainTextToken,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'isSystemAdmin' => (bool) $user->is_system_admin,
            ],
            'accounts' => $accounts,
            'defaultAccountId' => (int) $account->id,
            'redirect' => (string) ($payload['redirect'] ?? ''),
        ], now()->addMinutes(3));

        return ['handoff' => $handoff];
    }

    /**
     * Utilizador já autenticado: só actualiza Meta Ads do workspace.
     */
    public function completeLinkMeta(string $code, string $state): void
    {
        $payload = $this->pullState($state);
        if (($payload['flow'] ?? '') !== 'link_meta') {
            throw new RuntimeException('State inválido para ligação Meta.');
        }

        $userId = (int) ($payload['userId'] ?? 0);
        $accountId = (int) ($payload['accountId'] ?? 0);
        if ($userId < 1 || $accountId < 1) {
            throw new RuntimeException('Ligação Meta inválida (sessão).');
        }

        $accessToken = $this->exchangeForLongLivedToken($code);
        (new MetaAdsOAuth)->persistConnection($accountId, $userId, $accessToken);
    }

    /**
     * @return array{token:string,user:array<string,mixed>,accounts:list<array<string,mixed>>,defaultAccountId:int,redirect:string}
     */
    public function consumeHandoff(string $handoff): array
    {
        $key = $this->handoffKey(trim($handoff));
        $data = Cache::pull($key);
        if (! is_array($data) || empty($data['token'])) {
            throw new RuntimeException('Sessão de login expirada. Tente novamente.');
        }

        return $data;
    }

    private function exchangeForLongLivedToken(string $code): string
    {
        $appId = trim((string) config('meta_ads.app_id', ''));
        $appSecret = trim((string) config('meta_ads.app_secret', ''));
        $redirectUri = trim((string) config('meta_ads.redirect_uri', ''));
        if ($appId === '' || $appSecret === '' || $redirectUri === '') {
            throw new RuntimeException('META_APP_ID / META_APP_SECRET / META_ADS_REDIRECT_URI obrigatórios.');
        }

        $version = trim((string) config('meta_ads.graph_version', 'v21.0'));

        $short = $this->http()->get('https://graph.facebook.com/'.$version.'/oauth/access_token', [
            'client_id' => $appId,
            'client_secret' => $appSecret,
            'redirect_uri' => $redirectUri,
            'code' => $code,
        ]);

        if (! $short->successful()) {
            throw new RuntimeException('Falha ao obter token (HTTP '.$short->status().').');
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

        if ($long->successful()) {
            $t = trim((string) ($long->json('access_token') ?? ''));
            if ($t !== '') {
                return $t;
            }
        }

        return $shortToken;
    }

    /**
     * @return array{id:string,name:?string,email:?string}
     */
    private function fetchProfile(string $accessToken): array
    {
        $version = trim((string) config('meta_ads.graph_version', 'v21.0'));
        $res = $this->http()->get('https://graph.facebook.com/'.$version.'/me', [
            'fields' => 'id,name,email',
            'access_token' => $accessToken,
        ]);

        if (! $res->successful()) {
            throw new RuntimeException('Não foi possível ler o perfil Facebook.');
        }

        $j = $res->json();
        if (! is_array($j) || empty($j['id'])) {
            throw new RuntimeException('Resposta de perfil Facebook inválida.');
        }

        return [
            'id' => (string) $j['id'],
            'name' => isset($j['name']) ? (string) $j['name'] : null,
            'email' => isset($j['email']) ? (string) $j['email'] : null,
        ];
    }

    /**
     * @param  array{id:string,name:?string,email:?string}  $profile
     */
    private function findOrCreateUser(array $profile): User
    {
        $fbId = $profile['id'];
        $user = User::query()->where('facebook_id', $fbId)->first();

        $email = trim((string) ($profile['email'] ?? ''));
        if (! $user && $email !== '') {
            $user = User::query()->where('email', $email)->first();
            if ($user && ! $user->facebook_id) {
                $user->facebook_id = $fbId;
                $user->save();
            }
        }

        if ($user) {
            return $user;
        }

        if ($email === '') {
            $email = 'fb_'.$fbId.'@facebook.guerova.local';
        }

        return User::query()->create([
            'name' => $profile['name'] ?: 'Utilizador Facebook',
            'email' => $email,
            'facebook_id' => $fbId,
            'password' => Hash::make(Str::random(40)),
            'email_verified_at' => now(),
        ]);
    }

    private function resolveAccountForUser(User $user, int $preferredAccountId): Account
    {
        if ($preferredAccountId > 0) {
            $preferred = $user->accounts()->where('accounts.id', $preferredAccountId)->first();
            if ($preferred) {
                return $preferred;
            }
        }

        $existing = $user->accounts()->orderBy('accounts.id')->first();
        if ($existing) {
            return $existing;
        }

        $slug = 'fb-'.substr(sha1((string) $user->facebook_id), 0, 12);
        $account = Account::query()->firstOrCreate(
            ['slug' => $slug],
            ['name' => ($user->name ?: 'Cliente').' — Meta']
        );

        if (! $user->accounts()->where('accounts.id', $account->id)->exists()) {
            $user->accounts()->attach($account->id, ['role' => 'account_admin']);
        }

        return $account;
    }

    private function persistMetaConnection(int $accountId, int $userId, string $accessToken): void
    {
        if (! (bool) config('meta_ads.enabled')) {
            return;
        }

        (new MetaAdsOAuth)->persistConnection($accountId, $userId, $accessToken);
    }

    /**
     * @return list<array{id:int,name:string,slug:string,role:string}>
     */
    private function formatAccounts(User $user): array
    {
        return $user->accounts()
            ->get(['accounts.id', 'accounts.name', 'accounts.slug', 'account_user.role'])
            ->map(fn ($a) => [
                'id' => $a->id,
                'name' => $a->name,
                'slug' => $a->slug,
                'role' => (string) ($a->pivot?->role ?? ''),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function pullState(string $state): array
    {
        $payload = Cache::pull($this->stateKey($state));
        if (! is_array($payload)) {
            throw new RuntimeException('State inválido/expirado.');
        }

        return $payload;
    }

    private function stateKey(string $state): string
    {
        return 'facebook_oauth_state:'.$state;
    }

    private function handoffKey(string $handoff): string
    {
        return 'facebook_auth_handoff:'.$handoff;
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
