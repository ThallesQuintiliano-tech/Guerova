<?php

namespace App\Services;

use App\Support\OutboundHttpSsl;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class GeminiCampaignPackGenerator
{
    /**
     * @param  array<string, mixed>  $briefing
     * @return array{pack: array<string, mixed>, model: string}
     */
    public function generate(array $briefing): array
    {
        $apiKey = trim((string) config('gemini.api_key', ''));
        if ($apiKey === '') {
            throw new RuntimeException('GEMINI_API_KEY não configurada no backend/.env');
        }

        $lastError = null;
        foreach ($this->modelsToTry() as $model) {
            try {
                return $this->generateWithModel($briefing, $apiKey, $model);
            } catch (RuntimeException $e) {
                $lastError = $e;
                if (! $this->isQuotaOrRateLimitError($e)) {
                    throw $e;
                }
            }
        }

        throw $lastError ?? new RuntimeException('Gemini indisponível (quota ou limite).');
    }

    /**
     * @return list<string>
     */
    private function modelsToTry(): array
    {
        $primary = trim((string) config('gemini.model', 'gemini-2.5-flash'));
        $extra = trim((string) config('gemini.fallback_models', 'gemini-2.5-flash,gemini-1.5-flash'));
        $candidates = array_filter(array_merge(
            $primary !== '' ? [$primary] : [],
            array_map('trim', explode(',', $extra))
        ));

        return array_values(array_unique(array_slice($candidates, 0, 2)));
    }

    private function isQuotaOrRateLimitError(RuntimeException $e): bool
    {
        $m = strtolower($e->getMessage());

        return str_contains($m, '429')
            || str_contains($m, 'quota')
            || str_contains($m, 'rate limit')
            || str_contains($m, 'limit: 0');
    }

    /**
     * @param  array<string, mixed>  $briefing
     * @return array{pack: array<string, mixed>, model: string}
     */
    private function generateWithModel(array $briefing, string $apiKey, string $model): array
    {
        $timeout = max(15, (int) config('gemini.timeout', 60));
        $briefingJson = json_encode($briefing, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $system = $this->systemPrompt();
        $fingerprint = substr(hash('sha256', $briefingJson), 0, 12);
        $user = <<<USER
Briefing (JSON) — campanha Meta Ads imóveis BR. ID desta geração: {$fingerprint}.

Cada campo do JSON é obrigatório de considerar. Os textos devem ser ÚNICOS para ESTE briefing (não use frases genéricas iguais entre campanhas diferentes).

{$briefingJson}
USER;

        $url = 'https://generativelanguage.googleapis.com/v1beta/models/'.rawurlencode($model).':generateContent';

        try {
            $response = OutboundHttpSsl::apply(
                Http::timeout($timeout)->acceptJson()
            )->post($url.'?key='.rawurlencode($apiKey), [
                'systemInstruction' => [
                    'parts' => [['text' => $system]],
                ],
                'contents' => [
                    [
                        'role' => 'user',
                        'parts' => [['text' => $user]],
                    ],
                ],
                'generationConfig' => [
                    'temperature' => 0.92,
                    'topP' => 0.95,
                    'responseMimeType' => 'application/json',
                ],
            ]);
        } catch (Throwable $e) {
            throw new RuntimeException('Falha de rede ao chamar Gemini ('.$model.'): '.$e->getMessage(), 0, $e);
        }

        if (! $response->successful()) {
            $msg = $response->json('error.message') ?? $response->body();
            $detail = is_string($msg) ? $msg : json_encode($msg);
            throw new RuntimeException('Gemini API ['.$model.'] '.$response->status().': '.$detail);
        }

        $text = $this->extractText($response->json());
        $pack = $this->decodePackJson($text);

        return [
            'pack' => CampaignPackNormalizer::normalize($pack, $briefing),
            'model' => $model,
        ];
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
Você é redator sênior de Meta Ads para imóveis no Brasil (WhatsApp Business).

Recebe um briefing JSON único. Gere copy ORIGINAL para ESTE imóvel — nunca reutilize o mesmo parágrafo entre briefings diferentes.

Responda APENAS com JSON válido (sem markdown), nesta estrutura:

{
  "metaObjective": "resumo do objetivo",
  "campaign": {
    "objective": "do briefing",
    "name": "do briefing",
    "budgetStrategy": "do briefing"
  },
  "adSet": {
    "name": "",
    "conversionType": "WhatsApp Business",
    "targetAudience": "",
    "geoTargeting": "",
    "dailyBudget": "",
    "schedulePeriod": "",
    "interestsSegment": "",
    "customAudience": "",
    "placements": "Feed e Stories Instagram e Facebook",
    "bidStrategy": "Menor custo (automático)"
  },
  "ad": {
    "propertyName": "",
    "propertyType": "",
    "priceRange": "",
    "highlights": "",
    "format": "",
    "cta": "Fale conosco",
    "creativeAssets": "",
    "urgency": ""
  },
  "adCopy": {
    "primaryTexts": [
      "texto 1: ângulo emocional/casa própria — citar propertyName, priceRange, propertyHighlights, urgencyOffer",
      "texto 2: ângulo racional/localização — citar adSetName, geoTargeting, targetAudience, dailyBudget, schedulePeriod — frase diferente do texto 1"
    ],
    "headlines": ["3 títulos distintos, max 40 caracteres, incluir nome do empreendimento ou preço em pelo menos 2"],
    "descriptions": ["2 descrições secundárias diferentes entre si, max 90 caracteres"],
    "whatsappFollowup": "mensagem personalizada citando propertyName e região (adSetName ou geo)"
  },
  "creativeSuggestions": {
    "imageIdeas": ["3 ideias de criativo estático/carrossel"],
    "videoScript": ["gancho 3s", "meio 12s", "CTA 5s"],
    "linkCaptionSuggestions": ["3 legendas"]
  },
  "metaAdsChecklist": ["5-7 passos objetivos para configurar campanha/conjunto/anúncio no Meta"],
  "audienceDraft": {
    "age": "faixa etária resumida",
    "geoText": "resumo da geo do briefing",
    "interests": ["3-5 interesses em português"]
  }
}

Regras obrigatórias:
- Português do Brasil.
- PROIBIDO: "Realize o sonho da casa própria" como abertura genérica; "Seu novo lar te espera"; "Consulte nossos corretores" sem contexto; "Apartamentos com lazer completo" sem citar o empreendimento.
- OBRIGATÓRIO citar literalmente: propertyName, priceRange, propertyHighlights, adSetName ou trecho de geoTargeting em cada primaryText.
- Os 2 primaryTexts devem ter aberturas e argumentos DIFERENTES (emoção vs localização/investimento).
- videoScript e imageIdeas devem refletir adFormat e creativeAssets do briefing.
- Não invente preço, endereço ou metragem que não estejam no JSON.
- CTA: Fale conosco / WhatsApp.
PROMPT;
    }

    /**
     * @param  mixed  $json
     */
    private function extractText(mixed $json): string
    {
        if (! is_array($json)) {
            throw new RuntimeException('Resposta Gemini inválida.');
        }

        $candidates = $json['candidates'] ?? null;
        if (! is_array($candidates) || $candidates === []) {
            $reason = $json['promptFeedback']['blockReason'] ?? 'sem candidatos';
            throw new RuntimeException('Gemini não devolveu conteúdo: '.$reason);
        }

        $parts = $candidates[0]['content']['parts'] ?? null;
        if (! is_array($parts)) {
            throw new RuntimeException('Gemini: parts ausentes na resposta.');
        }

        $chunks = [];
        foreach ($parts as $part) {
            if (is_array($part) && isset($part['text']) && is_string($part['text'])) {
                $chunks[] = $part['text'];
            }
        }

        $text = trim(implode("\n", $chunks));
        if ($text === '') {
            throw new RuntimeException('Gemini devolveu texto vazio.');
        }

        return $text;
    }

    private function decodePackJson(string $text): array
    {
        $text = trim($text);
        if (preg_match('/^```(?:json)?\s*(.*?)```\s*$/s', $text, $m)) {
            $text = trim($m[1]);
        }

        try {
            $decoded = json_decode($text, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            throw new RuntimeException('Gemini devolveu JSON inválido.');
        }

        if (! is_array($decoded)) {
            throw new RuntimeException('Pacote da campanha deve ser um objeto JSON.');
        }

        return $decoded;
    }
}
