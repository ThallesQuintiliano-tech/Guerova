<?php

/**
 * Symfony HttpFoundation 8.x chama request_parse_body() (PHP 8.4+).
 * Em PHP 8.3, DELETE/PATCH/PUT quebravam com fatal error e o frontend via "Erro HTTP 200".
 */
if (! class_exists('RequestParseBodyException', false)) {
    class RequestParseBodyException extends Exception {}
}

if (! function_exists('request_parse_body')) {
    /**
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    function request_parse_body(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            return [[], []];
        }

        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
        $contentType = strtolower(trim(explode(';', (string) $contentType)[0]));

        if ($contentType === 'application/x-www-form-urlencoded') {
            $post = [];
            parse_str($raw, $post);

            return [$post, []];
        }

        if ($contentType === 'application/json') {
            $decoded = json_decode($raw, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new RequestParseBodyException(json_last_error_msg());
            }

            return [is_array($decoded) ? $decoded : [], []];
        }

        if (str_starts_with($contentType, 'multipart/form-data')) {
            throw new RequestParseBodyException('multipart/form-data requires PHP 8.4 request_parse_body().');
        }

        return [[], []];
    }
}
