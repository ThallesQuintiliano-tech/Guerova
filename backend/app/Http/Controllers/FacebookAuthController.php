<?php

namespace App\Http\Controllers;

use App\Services\FacebookAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class FacebookAuthController extends Controller
{
    /**
     * Modelo A — início do login (página pública).
     */
    public function authorizeUrl(Request $request, FacebookAuthService $facebook): JsonResponse
    {
        try {
            $redirect = trim((string) $request->query('redirect', '/leadmaster/inicio'));
            $url = $facebook->buildAuthUrl('login', 0, 0, ['redirect' => $redirect]);

            return response()->json(['ok' => true, 'url' => $url]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 400);
        }
    }

    /**
     * Troca handoff (one-time) por token Sanctum — chamado pelo SPA após redirect.
     */
    public function handoff(Request $request, FacebookAuthService $facebook): JsonResponse
    {
        $data = $request->validate([
            'handoff' => ['required', 'string', 'min:20'],
        ]);

        try {
            $session = $facebook->consumeHandoff((string) $data['handoff']);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 400);
        }

        return response()->json([
            'ok' => true,
            'token' => $session['token'],
            'user' => $session['user'],
            'accounts' => $session['accounts'],
            'defaultAccountId' => $session['defaultAccountId'] ?? null,
            'redirect' => $session['redirect'] ?? '/leadmaster/inicio',
        ]);
    }

    /**
     * Callback único Facebook (login Modelo A ou ligação Meta em sessão).
     */
    public function callback(Request $request, FacebookAuthService $facebook): RedirectResponse
    {
        $origin = rtrim((string) config('meta_ads.oauth_frontend_origin'), '/');
        $loginUrl = $origin.'/pages/login';
        $configUrl = $origin.'/leadmaster/configuracao';

        $error = (string) $request->query('error', '');
        if ($error !== '') {
            return redirect()->away($loginUrl.'?facebook=denied');
        }

        $code = (string) $request->query('code', '');
        $state = (string) $request->query('state', '');
        if ($code === '' || $state === '') {
            return redirect()->away($loginUrl.'?facebook=error');
        }

        $flow = '';
        try {
            $peek = \Illuminate\Support\Facades\Cache::get('facebook_oauth_state:'.$state);
            $flow = is_array($peek) ? (string) ($peek['flow'] ?? '') : '';

            if ($flow === 'link_meta') {
                $facebook->completeLinkMeta($code, $state);

                return redirect()->away($configUrl.'?meta_ads=ok');
            }

            $result = $facebook->completeLogin($code, $state);

            return redirect()->away($loginUrl.'?handoff='.urlencode($result['handoff']));
        } catch (\Throwable) {
            if ($flow === 'link_meta') {
                return redirect()->away($configUrl.'?meta_ads=error');
            }

            return redirect()->away($loginUrl.'?facebook=error');
        }
    }
}
