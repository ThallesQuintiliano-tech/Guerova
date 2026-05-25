<?php

namespace App\Services;

use Throwable;

final class GeminiErrorMessage
{
    public static function friendly(Throwable $e): string
    {
        $raw = $e->getMessage();
        $lower = strtolower($raw);

        if (str_contains($lower, 'gemini_api_key') || str_contains($lower, 'não configurada')) {
            return 'Configure GEMINI_API_KEY no backend/.env e reinicie o servidor.';
        }

        if (str_contains($lower, '429') || str_contains($lower, 'quota') || str_contains($lower, 'limit: 0')) {
            return 'Cota gratuita do Gemini esgotada ou modelo sem quota no seu plano. '
                .'Troque GEMINI_MODEL para gemini-2.5-flash no .env, aguarde ~1 minuto e tente de novo. '
                .'O pacote abaixo foi gerado localmente (sem IA) até a API voltar.';
        }

        if (str_contains($lower, '403') || str_contains($lower, 'permission')) {
            return 'Chave Gemini sem permissão para este modelo. Verifique a API key no Google AI Studio.';
        }

        if (strlen($raw) > 280) {
            return substr($raw, 0, 280).'…';
        }

        return $raw;
    }
}
