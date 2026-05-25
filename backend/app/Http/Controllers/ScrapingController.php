<?php

namespace App\Http\Controllers;

use App\Services\BrazilLocationSearch;
use App\Services\SimpleSectorScraper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class ScrapingController extends Controller
{
    public function __construct(
        private readonly SimpleSectorScraper $scraper,
        private readonly BrazilLocationSearch $locations
    ) {}

    public function locations(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:80'],
            'uf' => ['nullable', 'string', 'size:2'],
        ]);

        $uf = isset($validated['uf']) ? strtoupper($validated['uf']) : null;

        return response()->json([
            'ok' => true,
            'items' => $this->locations->search($validated['q'], $uf),
        ]);
    }

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
