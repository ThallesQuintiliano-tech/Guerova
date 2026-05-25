<?php

namespace App\Http\Controllers;

use App\Services\MetaAdsOAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class MetaAdsOAuthController extends Controller
{
    public function authorizeUrl(Request $request, MetaAdsOAuth $oauth): JsonResponse
    {
        if (! (bool) config('meta_ads.enabled')) {
            return response()->json([
                'ok' => false,
                'paused' => true,
                'error' => 'Integração com Meta Ads está pausada no momento.',
            ], 503);
        }

        try {
            $user = $request->user();
            $account = $request->attributes->get('account');
            $url = $oauth->buildAuthUrl(accountId: (int) $account->id, userId: (int) $user->id);

            return response()->json(['ok' => true, 'url' => $url]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 400);
        }
    }

    public function start(Request $request, MetaAdsOAuth $oauth): RedirectResponse
    {
        if (! (bool) config('meta_ads.enabled')) {
            abort(503, 'Integração com Meta Ads está pausada no momento.');
        }

        $user = $request->user();
        $account = $request->attributes->get('account');
        $url = $oauth->buildAuthUrl(accountId: (int) $account->id, userId: (int) $user->id);

        return redirect()->away($url);
    }

}
