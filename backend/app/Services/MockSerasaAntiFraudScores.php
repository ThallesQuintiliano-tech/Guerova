<?php

namespace App\Services;

/**
 * Resposta fictícia no mesmo formato esperado pelo frontend (enrichments[].scores[]).
 * CPFs de exemplo (válidos só para teste de software — não são pessoas reais):
 * - 39053344705 → perfil forte (score alto, risco baixo)
 * - 11144477735 → perfil médio
 * - 52998224725 → perfil fraco (score baixo, risco alto)
 * Qualquer outro CPF de 11 dígitos → resultado determinístico derivado do número.
 */
class MockSerasaAntiFraudScores
{
    /** @var array<string, array{score: int, risk: string, hint: string}> */
    private const DEMO_CPFS = [
        // CPFs frequentemente usados em documentação / exemplos
        '39053344705' => ['score' => 842, 'risk' => 'LOW', 'hint' => 'Indicativo mock: bom histórico para triagem de financiamento.'],
        '11144477735' => ['score' => 612, 'risk' => 'MEDIUM', 'hint' => 'Indicativo mock: análise intermediária; depende da política da financeira.'],
        '52998224725' => ['score' => 318, 'risk' => 'HIGH', 'hint' => 'Indicativo mock: risco elevado; baixa probabilidade de aprovação só pelo score.'],
    ];

    /**
     * @param  string[]  $models
     */
    public function peopleEnrichment(string $cpf, array $models = ['FRAUD_SCORE_PF']): array
    {
        $cpfDigits = preg_replace('/\D+/', '', $cpf) ?? '';
        $cpfDigits = (string) $cpfDigits;

        if ($models === []) {
            $models = ['FRAUD_SCORE_PF'];
        }

        $profile = self::DEMO_CPFS[$cpfDigits] ?? $this->deriveProfile($cpfDigits);

        $scores = [];
        foreach ($models as $model) {
            $scores[] = [
                'model' => $model,
                'score' => $profile['score'],
                'recomendationRiskEnum' => $profile['risk'],
                'mockHint' => $profile['hint'],
            ];
        }

        return [
            'enrichments' => [
                [
                    'scores' => $scores,
                ],
            ],
            'mockMeta' => [
                'source' => 'mock',
                'message' => 'Dados gerados localmente. Defina SERASA_SCORE_USE_MOCK=false e credenciais Serasa para API real.',
            ],
        ];
    }

    /**
     * @return array{score: int, risk: string, hint: string}
     */
    private function deriveProfile(string $cpfDigits): array
    {
        $sum = 0;
        for ($i = 0; $i < 11; $i++) {
            $sum += (int) $cpfDigits[$i];
        }
        $bucket = $sum % 3;

        return match ($bucket) {
            0 => ['score' => 580 + ($sum % 120), 'risk' => 'MEDIUM', 'hint' => 'Indicativo mock (derivado do CPF): cenário médio.'],
            1 => ['score' => 420 + ($sum % 100), 'risk' => 'HIGH', 'hint' => 'Indicativo mock (derivado do CPF): cenário mais conservador.'],
            default => ['score' => 700 + ($sum % 80), 'risk' => 'LOW', 'hint' => 'Indicativo mock (derivado do CPF): cenário mais favorável.'],
        };
    }
}
