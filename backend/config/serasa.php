<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Serasa Experian — Anti Fraud Scores
    |--------------------------------------------------------------------------
    |
    | Token (IAM) é gerado via Basic Auth (clientId:clientSecret) e dura ~1h.
    | Os endpoints de score usam Authorization: Bearer <token>.
    |
    | Docs: https://developer.serasaexperian.com.br/api/anti-fraud-scores
    */

    'iam_url' => env('SERASA_IAM_URL', 'https://uat-api.serasaexperian.com.br/security/iam/v1/client-identities/login'),

    // Base do produto Anti Fraud Scores (sem barra final).
    // Ex.: https://uat-api.serasaexperian.com.br/anti-fraud-scores/v1
    'scores_base_url' => rtrim((string) env('SERASA_SCORES_BASE_URL', ''), '/'),

    'client_id' => env('SERASA_CLIENT_ID', ''),
    'client_secret' => env('SERASA_CLIENT_SECRET', ''),

    /*
    | Chave de descriptografia dos campos DOCUMENTCRYPTED da massa de testes (mesmo fluxo que Python cryptocode.decrypt).
    | Solicitação: implantacao@experian.com (CNPJ com contrato ativo).
    */
    'document_decrypt_key' => (string) env('SERASA_DOCUMENT_DECRYPT_KEY', ''),
];
