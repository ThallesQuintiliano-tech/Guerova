<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class SimpleSectorScraper
{
    /**
     * Retorna um preview no formato que o frontend usa (columns + rows),
     * com dados reais do OpenStreetMap (Overpass API) por segmento.
     *
     * @return array{sectorId:string,sectorLabel:string,columns:array<int,array{key:string,label:string}>,rows:array<int,array<string,mixed>>,totalRequested:int,shown:int,jobId:string}
     */
    public function runPreview(string $source, string $sectorId, string $city, int $quantity): array
    {
        $cap = max(1, min(40, $quantity));
        $sector = $this->sectorDefinition($sectorId);
        $resolvedCity = trim($city) !== '' ? trim($city) : (string) config('scraping.default_city', 'São Paulo, Brasil');

        $rows = $source === 'google'
            ? $this->googlePlacesRows($sector, $resolvedCity, $cap)
            : $this->openStreetMapRows($sector, $resolvedCity, $cap);

        return [
            'sectorId' => $sector['id'],
            'sectorLabel' => $sector['label'],
            'columns' => [
                ['key' => 'id', 'label' => 'ID'],
                ['key' => 'empresa', 'label' => 'Empresa'],
                ['key' => 'telefone', 'label' => 'Telefone'],
                ['key' => 'email', 'label' => 'E-mail'],
                ['key' => 'site', 'label' => 'Site'],
                ['key' => 'instagram', 'label' => 'Instagram'],
                ['key' => 'cidade', 'label' => 'Cidade'],
                ['key' => 'extra', 'label' => 'Observação'],
                ['key' => 'fonteTipo', 'label' => 'Origem na internet'],
                ['key' => 'urlOrigem', 'label' => 'URL capturada'],
                ['key' => 'capturadoEm', 'label' => 'Capturado em'],
                ['key' => 'scrapeStatus', 'label' => 'Scrape status'],
                ['key' => 'scrapeHttp', 'label' => 'HTTP'],
                ['key' => 'scrapeEmail', 'label' => 'E-mail (extraído)'],
                ['key' => 'scrapePhone', 'label' => 'Telefone (extraído)'],
                ['key' => 'scrapeInstagram', 'label' => 'Instagram (extraído)'],
            ],
            'rows' => $rows,
            'totalRequested' => $quantity,
            'shown' => count($rows),
            'jobId' => 'real-'.now()->format('YmdHis').'-'.substr(bin2hex(random_bytes(8)), 0, 8),
        ];
    }

    /**
     * @param  array{id:string,label:string,overpass_filters:array<int,string>}  $sector
     * @return array<int,array<string,mixed>>
     */
    private function openStreetMapRows(array $sector, string $resolvedCity, int $cap): array
    {
        $place = $this->geocodePlace($resolvedCity);

        $elements = $place['areaId']
            ? $this->overpassSearchByArea($place['areaId'], $sector['overpass_filters'], $cap)
            : $this->overpassSearchByBbox($place['bbox'], $sector['overpass_filters'], $cap);

        return array_map(function (array $el, int $i) use ($resolvedCity, $sector) {
            $tags = (array) ($el['tags'] ?? []);
            $type = (string) ($el['type'] ?? 'node');
            $id = (string) ($el['id'] ?? '');
            $osmUrl = $id !== '' ? sprintf('https://www.openstreetmap.org/%s/%s', $type, $id) : '';

            $website = (string) ($tags['website'] ?? $tags['contact:website'] ?? '');
            $email = (string) ($tags['email'] ?? $tags['contact:email'] ?? '');
            $phone = (string) ($tags['phone'] ?? $tags['contact:phone'] ?? $tags['contact:mobile'] ?? '');
            $insta = (string) ($tags['contact:instagram'] ?? '');

            return [
                'id' => 'osm-'.str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT),
                'empresa' => (string) ($tags['name'] ?? ''),
                'telefone' => $phone,
                'email' => $email,
                'site' => $website,
                'instagram' => $insta,
                'cidade' => $resolvedCity,
                'extra' => (string) ($tags['operator'] ?? $tags['brand'] ?? ''),
                'fonteTipo' => 'OpenStreetMap',
                'urlOrigem' => $osmUrl,
                'capturadoEm' => now()->subMinutes($i)->format('d/m/Y H:i:s'),
                'scrapeStatus' => 'ok',
                'scrapeHttp' => 200,
                'scrapeEmail' => $email !== '' ? $email : null,
                'scrapePhone' => $phone !== '' ? preg_replace('/\D+/', '', $phone) : null,
                'scrapeInstagram' => $insta !== '' ? $insta : null,
                'scrapeNote' => $sector['label'],
            ];
        }, $elements, array_keys($elements));
    }

    /**
     * @param  array{id:string,label:string,overpass_filters:array<int,string>}  $sector
     * @return array<int,array<string,mixed>>
     */
    private function googlePlacesRows(array $sector, string $resolvedCity, int $cap): array
    {
        $apiKey = (string) config('scraping.google_api_key', '');
        if (trim($apiKey) === '') {
            throw new RuntimeException('Google Places não configurado: defina GOOGLE_MAPS_API_KEY no backend/.env.');
        }

        $region = (string) config('scraping.google_region', 'BR');
        $pageSize = max(1, min(20, $cap));

        $textQuery = $sector['label'].' em '.$resolvedCity;

        $resp = Http::timeout(20)
            ->withHeaders([
                'Content-Type' => 'application/json',
                'X-Goog-Api-Key' => $apiKey,
                // Mantemos a resposta pequena, suficiente para preencher a grade
                'X-Goog-FieldMask' => 'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.googleMapsUri',
            ])
            ->post('https://places.googleapis.com/v1/places:searchText', [
                'textQuery' => $textQuery,
                'regionCode' => $region,
                'pageSize' => $pageSize,
            ]);

        if (! $resp->successful()) {
            Log::warning('Google Places error', ['status' => $resp->status(), 'body' => $resp->body()]);
            throw new RuntimeException('Google Places falhou ao buscar dados (HTTP '.$resp->status().').');
        }

        $json = $resp->json();
        $places = is_array($json) ? ($json['places'] ?? []) : [];
        if (! is_array($places)) {
            return [];
        }

        $places = array_slice($places, 0, $cap);

        return array_map(function (array $p, int $i) use ($resolvedCity, $sector) {
            $pid = (string) ($p['id'] ?? '');
            $name = (string) (($p['displayName']['text'] ?? '') ?: '');
            $address = (string) ($p['formattedAddress'] ?? '');
            $website = (string) ($p['websiteUri'] ?? '');
            $phone = (string) ($p['nationalPhoneNumber'] ?? $p['internationalPhoneNumber'] ?? '');
            $mapsUrl = (string) ($p['googleMapsUri'] ?? ($pid !== '' ? 'https://www.google.com/maps/search/?api=1&query_place_id='.$pid : ''));

            return [
                'id' => 'g-'.str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT),
                'empresa' => $name,
                'telefone' => $phone,
                'email' => '',
                'site' => $website,
                'instagram' => '',
                'cidade' => $resolvedCity,
                'extra' => $address,
                'fonteTipo' => 'Google Places',
                'urlOrigem' => $mapsUrl,
                'capturadoEm' => now()->subMinutes($i)->format('d/m/Y H:i:s'),
                'scrapeStatus' => 'ok',
                'scrapeHttp' => 200,
                'scrapeEmail' => null,
                'scrapePhone' => $phone !== '' ? preg_replace('/\D+/', '', $phone) : null,
                'scrapeInstagram' => null,
                'scrapeNote' => $sector['label'],
            ];
        }, $places, array_keys($places));
    }

    /**
     * @return array{id:string,label:string,overpass_filters:array<int,string>}
     */
    private function sectorDefinition(string $sectorId): array
    {
        $map = [
            // Tags OSM: https://wiki.openstreetmap.org/wiki/Map_features
            'imoveis' => [
                'id' => 'imoveis',
                'label' => 'Imóveis',
                'overpass_filters' => ['office=estate_agent'],
            ],
            'carros' => [
                'id' => 'carros',
                'label' => 'Carros',
                'overpass_filters' => ['shop=car', 'amenity=car_rental', 'amenity=car_wash'],
            ],
            'motos' => [
                'id' => 'motos',
                'label' => 'Motos',
                'overpass_filters' => ['shop=motorcycle'],
            ],
            'advocacia' => [
                'id' => 'advocacia',
                'label' => 'Advocacia',
                'overpass_filters' => ['office=lawyer'],
            ],
            'restaurantes' => [
                'id' => 'restaurantes',
                'label' => 'Restaurantes',
                'overpass_filters' => ['amenity=restaurant'],
            ],
        ];

        return $map[$sectorId] ?? [
            'id' => $sectorId,
            'label' => 'Segmento',
            'overpass_filters' => ['shop=*'],
        ];
    }

    /**
     * @return array{areaId:int|null,bbox:array{south:float,west:float,north:float,east:float}}
     */
    private function geocodePlace(string $query): array
    {
        $resp = Http::timeout(12)
            ->withHeaders(['User-Agent' => 'GuerovaScraper/0.2 (+local dev)'])
            ->get('https://nominatim.openstreetmap.org/search', [
                'q' => $query,
                'format' => 'json',
                'limit' => 1,
            ]);

        if (! $resp->successful()) {
            throw new RuntimeException('Geocoding falhou (Nominatim).');
        }

        $json = $resp->json();
        $first = is_array($json) ? ($json[0] ?? null) : null;
        $bb = is_array($first) ? ($first['boundingbox'] ?? null) : null;
        if (! is_array($bb) || count($bb) < 4) {
            throw new RuntimeException('Cidade/região não encontrada no geocoding.');
        }

        $osmType = (string) ($first['osm_type'] ?? '');
        $osmId = (int) ($first['osm_id'] ?? 0);

        $areaId = null;
        if ($osmId > 0) {
            // Overpass area ids:
            // - relation: 3600000000 + id
            // - way:      2400000000 + id
            if ($osmType === 'relation') {
                $areaId = 3600000000 + $osmId;
            } elseif ($osmType === 'way') {
                $areaId = 2400000000 + $osmId;
            }
        }

        // Nominatim boundingbox: [south, north, west, east] como strings
        return [
            'areaId' => $areaId,
            'bbox' => [
                'south' => (float) $bb[0],
                'north' => (float) $bb[1],
                'west' => (float) $bb[2],
                'east' => (float) $bb[3],
            ],
        ];
    }

    /**
     * @param  array<int,string>  $filters
     * @return array<int,array<string,mixed>>
     */
    private function overpassSearchByArea(int $areaId, array $filters, int $limit): array
    {
        $clauses = [];
        foreach ($filters as $f) {
            [$k, $v] = array_pad(explode('=', $f, 2), 2, '*');
            $k = trim($k);
            $v = trim($v);
            if ($k === '') {
                continue;
            }
            $tag = $v === '*' ? sprintf('["%s"]', $k) : sprintf('["%s"="%s"]', $k, $v);
            $clauses[] = sprintf('nwr%s(area.searchArea);', $tag);
        }
        if (empty($clauses)) {
            throw new RuntimeException('Segmento sem filtros OSM.');
        }

        $query = '[out:json][timeout:25];area('.$areaId.')->.searchArea;('.
            implode('', $clauses).
            ');out tags center;';

        $resp = Http::timeout(30)
            ->withHeaders([
                'User-Agent' => 'GuerovaScraper/0.2 (+local dev)',
                'Accept' => 'application/json',
            ])
            ->asForm()
            ->post('https://overpass-api.de/api/interpreter', [
                'data' => $query,
            ]);

        if (! $resp->successful()) {
            $body = (string) $resp->body();
            Log::warning('Overpass error', ['status' => $resp->status(), 'body' => $body]);
            throw new RuntimeException('Overpass API falhou ao buscar dados (HTTP '.$resp->status().').');
        }

        $json = $resp->json();
        $elements = is_array($json) ? ($json['elements'] ?? []) : [];
        if (! is_array($elements)) {
            return [];
        }

        return array_slice($elements, 0, $limit);
    }

    /**
     * @param  array{south:float,west:float,north:float,east:float}  $bbox
     * @param  array<int,string>  $filters
     * @return array<int,array<string,mixed>>
     */
    private function overpassSearchByBbox(array $bbox, array $filters, int $limit): array
    {
        $south = $bbox['south'];
        $north = $bbox['north'];
        $west = $bbox['west'];
        $east = $bbox['east'];

        $clauses = [];
        foreach ($filters as $f) {
            [$k, $v] = array_pad(explode('=', $f, 2), 2, '*');
            $k = trim($k);
            $v = trim($v);
            if ($k === '') {
                continue;
            }
            $tag = $v === '*' ? sprintf('["%s"]', $k) : sprintf('["%s"="%s"]', $k, $v);
            $clauses[] = sprintf('nwr%s(%F,%F,%F,%F);', $tag, $south, $west, $north, $east);
        }
        if (empty($clauses)) {
            throw new RuntimeException('Segmento sem filtros OSM.');
        }

        $query = '[out:json][timeout:25];('.
            implode('', $clauses).
            ');out tags center;';

        $resp = Http::timeout(30)
            ->withHeaders([
                'User-Agent' => 'GuerovaScraper/0.2 (+local dev)',
                'Accept' => 'application/json',
            ])
            ->asForm()
            ->post('https://overpass-api.de/api/interpreter', [
                'data' => $query,
            ]);

        if (! $resp->successful()) {
            $body = (string) $resp->body();
            Log::warning('Overpass error', ['status' => $resp->status(), 'body' => $body]);
            throw new RuntimeException('Overpass API falhou ao buscar dados (HTTP '.$resp->status().').');
        }

        $json = $resp->json();
        $elements = is_array($json) ? ($json['elements'] ?? []) : [];
        if (! is_array($elements)) {
            return [];
        }

        return array_slice($elements, 0, $limit);
    }
}
