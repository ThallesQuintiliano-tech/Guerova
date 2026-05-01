<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureWhatsAppBridgeSecret
{
    public function handle(Request $request, Closure $next): Response
    {
        if (app()->environment('local')) {
            return $next($request);
        }

        $expected = (string) config('whatsapp.bridge_secret');
        if ($expected === '') {
            abort(Response::HTTP_FORBIDDEN, 'WHATSAPP_BRIDGE_SECRET is not set in .env');
        }

        $given = (string) $request->header('X-Guerova-Secret', '');
        if (! hash_equals($expected, $given)) {
            abort(Response::HTTP_FORBIDDEN, 'Invalid bridge secret');
        }

        return $next($request);
    }
}
