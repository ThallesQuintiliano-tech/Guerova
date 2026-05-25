<?php

return [
    // Cidade/região padrão quando o frontend só envia o segmento.
    'default_city' => env('SCRAPING_DEFAULT_CITY', 'São Paulo, Brasil'),

    // Google Places API (Text Search - New)
    'google_api_key' => env('GOOGLE_MAPS_API_KEY', ''),
    'google_region' => env('SCRAPING_GOOGLE_REGION', 'BR'),

    /*
     * Requisições externas (Nominatim, Overpass, Google Places) usam as mesmas opções SSL
     * que Meta Ads — ver META_ADS_HTTP_CAINFO e META_ADS_HTTP_VERIFY_SSL no .env.
     */
];
