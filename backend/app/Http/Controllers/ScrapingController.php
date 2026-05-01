<?php

namespace App\Http\Controllers;

use App\Services\SimpleSectorScraper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class ScrapingController extends Controller
{
    public function __construct(
        private readonly SimpleSectorScraper $scraper
    ) {}

    public function run(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source' => ['nullable', 'in:osm,google'],
            'sectorId' => ['required', 'string', 'max:40'],
            'city' => ['nullable', 'string', 'max:120'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:40'],
        ]);

        try {
            $result = $this->scraper->runPreview(
                source: (string) ($validated['source'] ?? 'osm'),
                sectorId: $validated['sectorId'],
                city: (string) ($validated['city'] ?? ''),
                quantity: (int) ($validated['quantity'] ?? 12)
            );
        } catch (Throwable $e) {
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ], 502);
        }

        return response()->json([
            'ok' => true,
            'preview' => $result,
        ]);
    }
}
