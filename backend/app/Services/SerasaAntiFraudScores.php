<?php

namespace App\Services;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SerasaAntiFraudScores
{
    private const CACHE_KEY = 'serasa.anti_fraud_scores.access_token';

    /**
     * @throws RequestException
     */
    public function peopleEnrichment(string $cpf, array $models = ['FRAUD_SCORE_PF']): array
    {
        $baseUrl = (string) config('serasa.scores_base_url');
        if (trim($baseUrl) === '') {
            throw new \RuntimeException('SERASA_SCORES_BASE_URL não configurado.');
        }

        $cpfDigits = preg_replace('/\D+/', '', $cpf) ?? '';
        $cpfDigits = (string) $cpfDigits;

        $payload = [
            'person' => [
                'document' => $cpfDigits,
            ],
            'score' => array_values($models),
        ];

        $token = $this->getAccessToken();

        $r = Http::timeout(25)
            ->acceptJson()
            ->asJson()
            ->withToken($token)
            ->post($baseUrl.'/people/enrichment', $payload);

        $r->throw();

        return (array) $r->json();
    }

    /**
     * @throws RequestException
     */
    private function getAccessToken(): string
    {
        $cached = Cache::get(self::CACHE_KEY);
        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $iamUrl = (string) config('serasa.iam_url');
        $clientId = (string) config('serasa.client_id');
        $clientSecret = (string) config('serasa.client_secret');

        if (trim($clientId) === '' || trim($clientSecret) === '') {
            throw new \RuntimeException('SERASA_CLIENT_ID / SERASA_CLIENT_SECRET não configurados.');
        }

        $basic = base64_encode($clientId.':'.$clientSecret);

        $r = Http::timeout(20)
            ->acceptJson()
            ->withHeaders([
                'Authorization' => 'Basic '.$basic,
            ])
            ->asJson()
            ->post($iamUrl);

        $r->throw();

        $j = (array) $r->json();
        $token = (string) ($j['accessToken'] ?? '');
        $expiresIn = (string) ($j['expiresIn'] ?? '');

        if (trim($token) === '') {
            throw new \RuntimeException('Token Serasa não retornou accessToken.');
        }

        // expiresIn vem como epoch (segundos) na doc.
        $ttlSeconds = 3300; // fallback (~55min)
        if ($expiresIn !== '' && Str::of($expiresIn)->match('/^\d+$/')->isNotEmpty()) {
            $exp = (int) $expiresIn;
            $now = now()->getTimestamp();
            $ttlSeconds = max(60, $exp - $now - 60); // 60s de folga
        }

        Cache::put(self::CACHE_KEY, $token, $ttlSeconds);

        return $token;
    }
}
