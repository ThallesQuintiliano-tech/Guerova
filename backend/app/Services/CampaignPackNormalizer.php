<?php

namespace App\Services;

/**
 * Normaliza pacote de campanha (Gemini ou fallback) com schema do briefing Meta Ads completo.
 */
final class CampaignPackNormalizer
{
    /**
     * @param  array<string, mixed>  $pack
     * @param  array<string, mixed>  $briefing
     * @return array<string, mixed>
     */
    public static function normalize(array $pack, array $briefing): array
    {
        $fallback = CampaignPackFallback::fromBriefing($briefing);

        $stringList = static function (mixed $v, array $default): array {
            if (! is_array($v)) {
                return $default;
            }
            $out = [];
            foreach ($v as $item) {
                if (is_string($item) && trim($item) !== '') {
                    $out[] = trim($item);
                }
            }

            return $out !== [] ? $out : $default;
        };

        $mergeBlock = static function (mixed $block, array $defaults): array {
            if (! is_array($block)) {
                return $defaults;
            }
            $out = $defaults;
            foreach ($defaults as $key => $defaultVal) {
                if (! array_key_exists($key, $block)) {
                    continue;
                }
                $v = $block[$key];
                if (is_string($defaultVal)) {
                    $t = trim((string) $v);
                    if ($t !== '') {
                        $out[$key] = $t;
                    }
                } elseif (is_array($defaultVal) && ! isset($defaultVal[0])) {
                    $out[$key] = is_array($v) ? $v : $defaultVal;
                }
            }

            return $out;
        };

        $adCopyRaw = is_array($pack['adCopy'] ?? null) ? $pack['adCopy'] : [];
        $fbAdCopy = $fallback['adCopy'];
        $adCopy = [
            'primaryTexts' => $stringList($adCopyRaw['primaryTexts'] ?? $pack['primaryTexts'] ?? null, $fbAdCopy['primaryTexts']),
            'headlines' => $stringList($adCopyRaw['headlines'] ?? $pack['headlines'] ?? null, $fbAdCopy['headlines']),
            'descriptions' => $stringList($adCopyRaw['descriptions'] ?? $pack['descriptions'] ?? null, $fbAdCopy['descriptions']),
            'whatsappFollowup' => trim((string) ($adCopyRaw['whatsappFollowup'] ?? $pack['whatsappFollowup'] ?? '')) ?: $fbAdCopy['whatsappFollowup'],
        ];

        $creativeRaw = is_array($pack['creativeSuggestions'] ?? null) ? $pack['creativeSuggestions'] : [];
        $fbCreative = $fallback['creativeSuggestions'];
        $creativeSuggestions = [
            'imageIdeas' => $stringList($creativeRaw['imageIdeas'] ?? $pack['imageIdeas'] ?? null, $fbCreative['imageIdeas']),
            'videoScript' => $stringList($creativeRaw['videoScript'] ?? $pack['videoScript'] ?? null, $fbCreative['videoScript']),
            'linkCaptionSuggestions' => $stringList(
                $creativeRaw['linkCaptionSuggestions'] ?? $pack['linkCaptionSuggestions'] ?? null,
                $fbCreative['linkCaptionSuggestions']
            ),
        ];

        $audience = is_array($pack['audienceDraft'] ?? null) ? $pack['audienceDraft'] : [];
        $fbAud = $fallback['audienceDraft'];

        $normalized = [
            'metaObjective' => trim((string) ($pack['metaObjective'] ?? '')) ?: $fallback['metaObjective'],
            'campaign' => $mergeBlock($pack['campaign'] ?? null, $fallback['campaign']),
            'adSet' => $mergeBlock($pack['adSet'] ?? null, $fallback['adSet']),
            'ad' => $mergeBlock($pack['ad'] ?? null, $fallback['ad']),
            'adCopy' => $adCopy,
            'creativeSuggestions' => $creativeSuggestions,
            'metaAdsChecklist' => $stringList($pack['metaAdsChecklist'] ?? null, $fallback['metaAdsChecklist']),
            'audienceDraft' => [
                'age' => trim((string) ($audience['age'] ?? '')) ?: $fbAud['age'],
                'geoText' => trim((string) ($audience['geoText'] ?? '')) ?: $fbAud['geoText'],
                'interests' => $stringList($audience['interests'] ?? null, $fbAud['interests']),
            ],
            'headlines' => $adCopy['headlines'],
            'primaryTexts' => $adCopy['primaryTexts'],
            'descriptions' => $adCopy['descriptions'],
            'ctas' => $stringList($pack['ctas'] ?? null, [$briefing['cta'] ?? 'Fale conosco']),
            'linkCaptionSuggestions' => $creativeSuggestions['linkCaptionSuggestions'],
            'imageIdeas' => $creativeSuggestions['imageIdeas'],
            'videoScript' => $creativeSuggestions['videoScript'],
            'whatsappFollowup' => $adCopy['whatsappFollowup'],
        ];

        return $normalized;
    }
}
