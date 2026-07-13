<?php

return [
    'api_key' => env('GEMINI_API_KEY'),
    'model' => env('GEMINI_MODEL', 'gemini-2.5-flash'),
    // Se o modelo principal falhar com 429/quota, tenta estes (ordem).
    'fallback_models' => env('GEMINI_FALLBACK_MODELS', 'gemini-2.5-flash,gemini-1.5-flash,gemini-2.0-flash-lite'),
    'timeout' => (int) env('GEMINI_TIMEOUT', 90),
    // Se a API falhar, devolve pacote local (mesma lógica do mock do frontend).
    'fallback_mock' => filter_var(
        env('GEMINI_FALLBACK_MOCK', 'true'),
        FILTER_VALIDATE_BOOL,
        FILTER_NULL_ON_FAILURE
    ) ?? true,
];
