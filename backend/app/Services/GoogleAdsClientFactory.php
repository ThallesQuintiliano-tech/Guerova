<?php

namespace App\Services;

use App\Models\Account;
use App\Models\GoogleAdsConnection;
use Google\Ads\GoogleAds\Lib\OAuth2TokenBuilder;
use Google\Ads\GoogleAds\Lib\V24\GoogleAdsClient;
use Google\Ads\GoogleAds\Lib\V24\GoogleAdsClientBuilder;
use RuntimeException;

class GoogleAdsClientFactory
{
    public function makeForAccount(Account $account): GoogleAdsClient
    {
        $developerToken = trim((string) config('google_ads.developer_token'));
        if ($developerToken === '') {
            throw new RuntimeException('GOOGLE_ADS_DEVELOPER_TOKEN não configurado no .env.');
        }

        $clientId = trim((string) config('google_ads.client_id'));
        $clientSecret = trim((string) config('google_ads.client_secret'));
        if ($clientId === '' || $clientSecret === '') {
            throw new RuntimeException('GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET não configurados.');
        }

        /** @var GoogleAdsConnection|null $conn */
        $conn = GoogleAdsConnection::query()->where('account_id', $account->id)->first();
        if (! $conn || trim((string) $conn->refresh_token) === '') {
            throw new RuntimeException('Google Ads não conectado para esta conta. Conclua o OAuth (GET /api/google-ads/oauth/start).');
        }

        $oauth = (new OAuth2TokenBuilder)
            ->withClientId($clientId)
            ->withClientSecret($clientSecret)
            ->withRefreshToken($conn->refresh_token)
            ->build();

        $transport = strtolower(trim((string) config('google_ads.transport', 'rest')));
        if (! in_array($transport, ['rest', 'grpc'], true)) {
            $transport = 'rest';
        }

        $builder = (new GoogleAdsClientBuilder)
            ->withDeveloperToken($developerToken)
            ->withOAuth2Credential($oauth)
            ->withTransport($transport);

        $loginId = $this->parseOptionalCustomerId((string) config('google_ads.login_customer_id', ''));
        if ($loginId !== null) {
            $builder->withLoginCustomerId((int) $loginId);
        }

        return $builder->build();
    }

    /**
     * Customer ID numérico sem hífens, ou null se vazio/ inválido.
     */
    public function parseOptionalCustomerId(string $raw): ?string
    {
        $digits = preg_replace('/\D/', '', $raw) ?? '';
        if ($digits === '' || $digits === '0') {
            return null;
        }

        return $digits;
    }
}
