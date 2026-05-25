<?php

namespace App\Services;

/**
 * Pacote local quando Gemini não está configurado ou falhou — textos variam por briefing.
 */
final class CampaignPackFallback
{
    /**
     * @param  array<string, mixed>  $briefing
     * @return array<string, mixed>
     */
    public static function fromBriefing(array $briefing): array
    {
        $name = trim((string) ($briefing['propertyName'] ?? $briefing['propertyTitle'] ?? '')) ?: 'Seu empreendimento';
        $campaignName = trim((string) ($briefing['campaignName'] ?? '')) ?: $name;
        $preco = trim((string) ($briefing['priceRange'] ?? $briefing['price'] ?? ''));
        $dest = trim((string) ($briefing['propertyHighlights'] ?? $briefing['highlights'] ?? ''));
        $geo = trim((string) ($briefing['geoTargeting'] ?? ''));
        $audience = trim((string) ($briefing['targetAudience'] ?? 'Homens e mulheres, 25 a 55 anos'));
        $urgency = trim((string) ($briefing['urgencyOffer'] ?? ''));
        $propertyType = trim((string) ($briefing['propertyType'] ?? 'Imóveis'));
        $adSetName = trim((string) ($briefing['adSetName'] ?? ''));
        $format = trim((string) ($briefing['adFormat'] ?? ''));
        $schedule = trim((string) ($briefing['schedulePeriod'] ?? ''));
        $budget = trim((string) ($briefing['dailyBudget'] ?? ''));
        $isVideo = str_contains(mb_strtolower($format), 'vídeo') || str_contains(mb_strtolower($format), 'video');

        $regionLabel = $adSetName !== '' ? $adSetName : (self::shortGeo($geo) ?: 'sua região');

        $primaryA = "🏠 {$name}: {$propertyType}".($preco !== '' ? " a partir de {$preco}" : '').'. '
            .($dest !== '' ? "Destaques: {$dest}. " : '')
            .($urgency !== '' ? "{$urgency} " : '')
            .'Mande um oi no WhatsApp — envio planta, valores e horários de visita.';

        $primaryB = "Procurando imóvel em {$regionLabel}? "
            ."Público: {$audience}. "
            .($budget !== '' ? "Investimento sugerido: {$budget}. " : '')
            .($schedule !== '' ? "Veiculação: {$schedule}. " : '')
            .'Toque em Fale conosco e fale direto com a equipe.';

        $headlines = [
            mb_substr("{$name} — {$regionLabel}", 0, 40),
            mb_substr($preco !== '' ? "{$preco} · {$propertyType}" : "Condições · {$name}", 0, 40),
            mb_substr($isVideo ? 'Tour em vídeo — agende visita' : "Lazer e localização · {$regionLabel}", 0, 40),
        ];

        $descriptions = [
            mb_substr("Corretores disponíveis no WhatsApp · {$name}", 0, 90),
            mb_substr($urgency !== '' ? $urgency : "Financiamento e documentação com assessoria.", 0, 90),
        ];

        $adCopy = [
            'primaryTexts' => [$primaryA, $primaryB],
            'headlines' => $headlines,
            'descriptions' => $descriptions,
            'whatsappFollowup' => "Olá! Vi o anúncio do {$name}. Quer que eu envie planta, tabela de preços e agenda de visitas em {$regionLabel}?",
        ];

        $creativeSuggestions = [
            'imageIdeas' => $isVideo
                ? [
                    "Thumbnail do vídeo: fachada {$name} + faixa {$preco}.",
                    'Reels 9:16: entrada → living → quartos (legendas com preço).',
                    "Stories: CTA 'Fale conosco' + mapa da região ({$regionLabel}).",
                ]
                : [
                    "Capa 4:5: {$name} + selo {$preco}.",
                    "Carrossel: diferenciais — {$dest}",
                    "Último slide: urgência — {$urgency}",
                ],
            'videoScript' => [
                "Gancho 3s: «Quem busca imóvel em {$regionLabel} precisa ver isso.»",
                'Meio 12s: '.($dest !== '' ? $dest : 'tour pelos ambientes principais').'.',
                "CTA 5s: «WhatsApp aberto — simulação e visita para {$name}.»",
            ],
            'linkCaptionSuggestions' => [
                "Fotos e planta — {$name}",
                'Simular parcelas no WhatsApp',
                "Agendar visita em {$regionLabel}",
            ],
        ];

        $age = '25–55';
        if (preg_match('/(\d+)\s*a\s*(\d+)/iu', $audience, $m)) {
            $age = $m[1].'–'.$m[2];
        }

        $interests = self::parseInterests($briefing['interestsSegment'] ?? '');

        return [
            'metaObjective' => trim((string) ($briefing['campaignObjective'] ?? '')) ?: 'Engajamento: Conversas iniciadas pelo WhatsApp',
            'campaign' => [
                'objective' => trim((string) ($briefing['campaignObjective'] ?? '')) ?: 'Engajamento: Conversas iniciadas pelo WhatsApp',
                'name' => $campaignName,
                'budgetStrategy' => trim((string) ($briefing['budgetStrategy'] ?? '')) ?: 'Orçamento do conjunto de anúncios',
            ],
            'adSet' => [
                'name' => $adSetName,
                'conversionType' => trim((string) ($briefing['conversionType'] ?? '')) ?: 'WhatsApp Business',
                'targetAudience' => $audience,
                'geoTargeting' => $geo,
                'dailyBudget' => $budget !== '' ? $budget : 'R$ 50,00 por dia',
                'schedulePeriod' => $schedule,
                'interestsSegment' => trim((string) ($briefing['interestsSegment'] ?? '')),
                'customAudience' => trim((string) ($briefing['customAudience'] ?? '')),
                'placements' => trim((string) ($briefing['placements'] ?? '')) ?: 'Feed e Stories do Instagram e Facebook',
                'bidStrategy' => trim((string) ($briefing['bidStrategy'] ?? '')) ?: 'Menor custo (automático)',
            ],
            'ad' => [
                'propertyName' => $name,
                'propertyType' => $propertyType,
                'priceRange' => $preco,
                'highlights' => $dest,
                'format' => $format,
                'cta' => trim((string) ($briefing['cta'] ?? '')) ?: 'Fale conosco',
                'creativeAssets' => trim((string) ($briefing['creativeAssets'] ?? '')),
                'urgency' => $urgency,
            ],
            'adCopy' => $adCopy,
            'creativeSuggestions' => $creativeSuggestions,
            'metaAdsChecklist' => [
                "Campanha «{$campaignName}»: engajamento → conversas WhatsApp.",
                "Conjunto «{$adSetName}»: geo — {$geo}",
                "Orçamento {$budget}; período {$schedule}.",
                'Anúncio: colar os 2 primary texts (ângulos diferentes) + headlines gerados.',
                'CTA Fale conosco; posicionamentos Feed + Stories.',
            ],
            'headlines' => $headlines,
            'primaryTexts' => $adCopy['primaryTexts'],
            'descriptions' => $descriptions,
            'ctas' => [trim((string) ($briefing['cta'] ?? '')) ?: 'Fale conosco'],
            'linkCaptionSuggestions' => $creativeSuggestions['linkCaptionSuggestions'],
            'imageIdeas' => $creativeSuggestions['imageIdeas'],
            'videoScript' => $creativeSuggestions['videoScript'],
            'audienceDraft' => [
                'age' => $age,
                'geoText' => $geo !== '' ? $geo : "Raio a partir de {$regionLabel}",
                'interests' => $interests,
            ],
            'whatsappFollowup' => $adCopy['whatsappFollowup'],
        ];
    }

    /**
     * @return list<string>
     */
    private static function parseInterests(mixed $segment): array
    {
        $seg = trim((string) $segment);
        if ($seg === '' || str_contains(mb_strtolower($seg), 'advantage')) {
            return ['Imóveis', 'Financiamento imobiliário', 'Decoração'];
        }
        $parts = preg_split('/[,;]+/u', $seg) ?: [];
        $out = [];
        foreach ($parts as $p) {
            $p = trim($p);
            if ($p !== '') {
                $out[] = $p;
            }
        }

        return $out !== [] ? array_slice($out, 0, 5) : ['Imóveis', 'Financiamento imobiliário'];
    }

    private static function shortGeo(string $geo): string
    {
        if ($geo === '') {
            return '';
        }
        if (preg_match('/,\s*([^,–-]+)\s*[–-]\s*([A-Z]{2})\b/u', $geo, $m)) {
            return trim($m[1]).' — '.trim($m[2]);
        }

        return mb_strlen($geo) > 48 ? mb_substr($geo, 0, 45).'…' : $geo;
    }
}
