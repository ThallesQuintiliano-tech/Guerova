<?php

return [
    'enabled' => (bool) env('META_ADS_ENABLED', false),

    /*
     * true: META_ADS_ACCESS_TOKEN + META_ADS_AD_ACCOUNT_ID do .env sobrescrevem a BD a cada pedido Meta (sem Facebook Login).
     */
    'prefer_env_token' => filter_var(
        env('META_ADS_PREFER_ENV_TOKEN', 'true'),
        FILTER_VALIDATE_BOOL,
        FILTER_NULL_ON_FAILURE
    ) ?? true,

    /** false: UI prioriza colar token; true: mostra também «Conectar com Facebook». */
    'oauth_enabled' => filter_var(
        env('META_ADS_OAUTH_ENABLED', 'false'),
        FILTER_VALIDATE_BOOL,
        FILTER_NULL_ON_FAILURE
    ) ?? false,

    'graph_version' => env('META_GRAPH_VERSION', 'v21.0'),
    // Opcional: mesmo App ID + App Secret (Definições → Básico) para debug_token nas mensagens de erro (scopes reais).
    'app_id' => env('META_APP_ID'),
    'app_secret' => env('META_APP_SECRET'),

    // OAuth (Facebook Login) — sem colar token manualmente
    'redirect_uri' => env('META_ADS_REDIRECT_URI', 'http://127.0.0.1:8000/api/auth/facebook/callback'),
    'oauth_frontend_origin' => rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/'),
    // Modelo A: login + Meta Ads numa autorização
    'oauth_scopes' => env('META_ADS_OAUTH_SCOPES', 'email,public_profile,ads_read,ads_management'),
    // Nome sugerido ao publicar (quickstart); o painel pode usar outro nome por campanha.
    'default_campaign_name' => env('META_ADS_DEFAULT_CAMPAIGN_NAME', 'My Quickstart Campaign'),

    /*
     * SSL ao chamar graph.facebook.com (Guzzle/cURL).
     * No Windows, se aparecer "unable to get local issuer certificate", ou defina META_ADS_HTTP_CAINFO
     * para um ficheiro cacert.pem (https://curl.se/ca/cacert.pem), ou em desenvolvimento local META_ADS_HTTP_VERIFY_SSL=false.
     */
    'http_verify_ssl' => filter_var(
        env('META_ADS_HTTP_VERIFY_SSL', 'true'),
        FILTER_VALIDATE_BOOL,
        FILTER_NULL_ON_FAILURE
    ) ?? true,
    'http_ca_bundle' => env('META_ADS_HTTP_CAINFO') ?: env('SSL_CERT_FILE') ?: null,
];
