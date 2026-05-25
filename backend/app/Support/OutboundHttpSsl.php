<?php

namespace App\Support;

use Illuminate\Http\Client\PendingRequest;

final class OutboundHttpSsl
{
    public static function apply(PendingRequest $request): PendingRequest
    {
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
