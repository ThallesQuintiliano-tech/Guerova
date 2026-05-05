<?php

namespace Tests\Unit;

use App\Services\MockSerasaAntiFraudScores;
use PHPUnit\Framework\TestCase;

class MockSerasaAntiFraudScoresTest extends TestCase
{
    public function test_demo_cpf_high_score(): void
    {
        $sut = new MockSerasaAntiFraudScores;
        $r = $sut->peopleEnrichment('39053344705', ['FRAUD_SCORE_PF']);
        $this->assertArrayHasKey('enrichments', $r);
        $this->assertSame('LOW', $r['enrichments'][0]['scores'][0]['recomendationRiskEnum']);
    }

    public function test_deterministic_any_cpf(): void
    {
        $sut = new MockSerasaAntiFraudScores;
        $a = $sut->peopleEnrichment('12345678909', ['FRAUD_SCORE_PF']);
        $b = $sut->peopleEnrichment('12345678909', ['FRAUD_SCORE_PF']);
        $this->assertSame($a['enrichments'][0]['scores'][0]['score'], $b['enrichments'][0]['scores'][0]['score']);
    }
}
