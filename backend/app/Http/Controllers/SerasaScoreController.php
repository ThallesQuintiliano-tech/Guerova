<?php

namespace App\Http\Controllers;

use App\Services\MockSerasaAntiFraudScores;
use App\Services\SerasaAntiFraudScores;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SerasaScoreController extends Controller
{
    public function people(
        Request $request,
        SerasaAntiFraudScores $serasa,
        MockSerasaAntiFraudScores $mockSerasa,
    ): JsonResponse {
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

        $useMock = (bool) config('serasa.score_use_mock');

        if ($useMock) {
            $result = $mockSerasa->peopleEnrichment($cpfDigits, $models);
        } else {
            // Integração real Serasa Experian (IAM + Anti Fraud Scores)
            $result = $serasa->peopleEnrichment($cpfDigits, $models);
        }

        return response()->json([
            'ok' => true,
            'cpf' => $cpfDigits,
            'mock' => $useMock,
            'result' => $result,
        ], 201);
    }
}
