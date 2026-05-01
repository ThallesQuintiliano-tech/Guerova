<?php

return [
    'client_id' => env('GOOGLE_ADS_CLIENT_ID', ''),
    'client_secret' => env('GOOGLE_ADS_CLIENT_SECRET', ''),
    'developer_token' => env('GOOGLE_ADS_DEVELOPER_TOKEN', ''),
    'default_customer_id' => env('GOOGLE_ADS_CUSTOMER_ID', ''),

    /** Conta MCC / manager: obrigatório para consultar contas filhas via API. Sem hífens. */
    'login_customer_id' => env('GOOGLE_ADS_LOGIN_CUSTOMER_ID', ''),

    /**
     * grpc (requer extensão PECL grpc) ou rest (HTTP, funciona sem grpc).
     *
     * @see https://developers.google.com/google-ads/api/docs/client-libs/php/transport
     */
    'transport' => env('GOOGLE_ADS_TRANSPORT', 'rest'),

    // Local dev default callback (must match Google Cloud OAuth client redirect URIs).
    'redirect_uri' => env('GOOGLE_ADS_REDIRECT_URI', 'http://localhost:8000/api/google-ads/oauth/callback'),

    /** Origem do SPA (Vite). Após OAuth, o browser é redirecionado para `/leadmaster/campanhas?google_ads=…`. */
    'oauth_frontend_origin' => rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/'),
];
