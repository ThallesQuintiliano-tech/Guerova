<?php

return [
    'enabled' => (bool) env('META_ADS_ENABLED', false),
    'graph_version' => env('META_GRAPH_VERSION', 'v21.0'),
    // Opcional: mesmo App ID + App Secret (Definições → Básico) para debug_token nas mensagens de erro (scopes reais).
    'app_id' => env('META_APP_ID'),
    'app_secret' => env('META_APP_SECRET'),
];

