<?php

namespace App\Http\Controllers;

use App\Services\SerasaAntiFraudScores;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SerasaScoreController extends Controller
{
    public function people(Request $request, SerasaAntiFraudScores $serasa): JsonResponse
    {
        $data = $request->validate([
            'cpf' => ['required', 'string'],
            // opcional: permite escolher modelos no futuro
            'models' => ['nullable', 'array'],
            'models.*' => ['string', 'max:80'],
        ]);

        $cpfDigits = preg_replace('/\D+/', '', (string) $data['cpf']) ?? '';
        $cpfDigits = (string) $cpfDigits;

        if (strlen($cpfDigits) !== 11) {
            throw ValidationException::withMessages([
                'cpf' => ['CPF deve conter 11 dígitos.'],
            ]);
        }

        $models = $data['models'] ?? ['FRAUD_SCORE_PF'];
        if (! is_array($models) || ! count($models)) {
            $models = ['FRAUD_SCORE_PF'];
        }

        $result = $serasa->peopleEnrichment($cpfDigits, $models);

        return response()->json([
            'ok' => true,
            'cpf' => $cpfDigits,
            'result' => $result,
        ], 201);
    }
}
