<?php

namespace App\Http\Controllers;

use App\Services\SerasaCryptocodeDecryptor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SerasaDecryptController extends Controller
{
    public function document(Request $request, SerasaCryptocodeDecryptor $decryptor): JsonResponse
    {
        $data = $request->validate([
            'document_encrypted' => ['required', 'string', 'max:2048'],
        ]);

        $key = (string) config('serasa.document_decrypt_key');
        if (trim($key) === '') {
            return response()->json([
                'ok' => false,
                'error' => 'missing_decrypt_key',
                'message' => 'Configure SERASA_DOCUMENT_DECRYPT_KEY no .env (chave fornecida pela Experian após validação do contrato).',
            ], 422);
        }

        $plain = $decryptor->decrypt((string) $data['document_encrypted'], $key);

        if ($plain === false) {
            return response()->json([
                'ok' => false,
                'error' => 'decryption_failed',
                'message' => 'Não foi possível descriptografar (chave incorreta ou payload inválido).',
            ], 422);
        }

        return response()->json([
            'ok' => true,
            'document' => $plain,
        ]);
    }
}
