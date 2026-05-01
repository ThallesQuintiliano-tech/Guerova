<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Meta WhatsApp Cloud API
    |--------------------------------------------------------------------------
    |
    | Crie um app em developers.facebook.com, adicione o produto WhatsApp,
    | gere um token permanente e copie o Phone number ID.
    |
    */

    'graph_version' => env('WHATSAPP_GRAPH_VERSION', 'v21.0'),

    'access_token' => env('WHATSAPP_ACCESS_TOKEN'),

    'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),

    /** App Secret (Meta app → Settings → Basic) — usado para validar X-Hub-Signature-256 no webhook */
    'app_secret' => env('WHATSAPP_APP_SECRET'),

    /** Token que você define e cola no painel Meta ao configurar o webhook */
    'verify_token' => env('WHATSAPP_WEBHOOK_VERIFY_TOKEN'),

    /**
     * Segredo para chamar POST /api/whatsapp/send a partir do Guerova (ex.: painel interno).
     * Não é o token da Meta. Gere uma string longa aleatória.
     */
    'bridge_secret' => env('WHATSAPP_BRIDGE_SECRET'),

];
