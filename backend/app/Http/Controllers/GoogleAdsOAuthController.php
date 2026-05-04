<?php

namespace App\Http\Controllers;

use App\Models\GoogleAdsConnection;
use App\Models\User;
use App\Services\GoogleAdsOAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class GoogleAdsOAuthController extends Controller
{
    /**
     * Retorna a URL de autorização (para o SPA abrir em nova aba / redirecionar com fetch autenticado).
     */
    public function authorizeUrl(Request $request, GoogleAdsOAuth $oauth): JsonResponse
    {
        if (! (bool) config('google_ads.enabled')) {
            return response()->json([
                'ok' => false,
                'paused' => true,
                'error' => 'Integração com Google Ads está pausada no momento.',
            ], 503);
        }

        try {
            /** @var User $user */
            $user = $request->user();
            $account = $request->attributes->get('account');
            $url = $oauth->buildAuthUrl(accountId: (int) $account->id, userId: (int) $user->id);

            return response()->json(['ok' => true, 'url' => $url]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 400);
        }
    }

    public function start(Request $request, GoogleAdsOAuth $oauth): RedirectResponse
    {
        if (! (bool) config('google_ads.enabled')) {
            abort(503, 'Integração com Google Ads está pausada no momento.');
        }

        /** @var User $user */
        $user = $request->user();
        $account = $request->attributes->get('account');

        $url = $oauth->buildAuthUrl(accountId: (int) $account->id, userId: (int) $user->id);

        return redirect()->away($url);
    }

    public function callback(Request $request, GoogleAdsOAuth $oauth): RedirectResponse
    {
        if (! (bool) config('google_ads.enabled')) {
            $origin = rtrim((string) config('google_ads.oauth_frontend_origin'), '/');
            $campanhas = $origin.'/leadmaster/campanhas';
            return redirect()->away($campanhas.'?google_ads=error');
        }

        $origin = rtrim((string) config('google_ads.oauth_frontend_origin'), '/');
        $campanhas = $origin.'/leadmaster/campanhas';

        $code = (string) $request->query('code', '');
        $state = (string) $request->query('state', '');
        if ($code === '' || $state === '') {
            return redirect()->away($campanhas.'?google_ads=error');
        }

        try {
            $ex = $oauth->exchangeCode($code, $state);
        } catch (\Throwable) {
            return redirect()->away($campanhas.'?google_ads=error');
        }

        GoogleAdsConnection::query()->updateOrCreate(
            ['account_id' => $ex['accountId']],
            [
                'created_by_user_id' => $ex['userId'],
                'customer_id' => (string) config('google_ads.default_customer_id', ''),
                'refresh_token' => $ex['refresh_token'],
                'scopes' => $ex['scopes'],
                'connected_email' => null,
            ]
        );

        return redirect()->away($campanhas.'?google_ads=ok');
    }
}
