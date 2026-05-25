<?php

namespace App\Services;

use App\Support\OutboundHttpSsl;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BrazilLocationSearch
{
    /** @var array<string, string> */
    private const STATE_NAME_TO_UF = [
        'acre' => 'AC',
        'alagoas' => 'AL',
        'amapá' => 'AP',
        'amapa' => 'AP',
        'amazonas' => 'AM',
        'bahia' => 'BA',
        'ceará' => 'CE',
        'ceara' => 'CE',
        'distrito federal' => 'DF',
        'espírito santo' => 'ES',
        'espirito santo' => 'ES',
        'goiás' => 'GO',
        'goias' => 'GO',
        'maranhão' => 'MA',
        'maranhao' => 'MA',
        'mato grosso' => 'MT',
        'mato grosso do sul' => 'MS',
        'minas gerais' => 'MG',
        'pará' => 'PA',
        'para' => 'PA',
        'paraíba' => 'PB',
        'paraiba' => 'PB',
        'paraná' => 'PR',
        'parana' => 'PR',
        'pernambuco' => 'PE',
        'piauí' => 'PI',
        'piaui' => 'PI',
        'rio de janeiro' => 'RJ',
        'rio grande do norte' => 'RN',
        'rio grande do sul' => 'RS',
        'rondônia' => 'RO',
        'rondonia' => 'RO',
        'roraima' => 'RR',
        'santa catarina' => 'SC',
        'são paulo' => 'SP',
        'sao paulo' => 'SP',
        'sergipe' => 'SE',
        'tocantins' => 'TO',
    ];

    /**
     * @return array<int, array{id:string,label:string,city:string,uf:string}>
     */
    public function search(string $query, ?string $uf = null, int $limit = 12): array
    {
        $query = trim($query);
        if (mb_strlen($query) < 2) {
            return [];
        }

        $uf = $uf !== null ? strtoupper(trim($uf)) : '';
        if ($uf !== '' && ! preg_match('/^[A-Z]{2}$/', $uf)) {
            $uf = '';
        }

        if ($uf !== '') {
            $ibge = $this->searchIbgeMunicipalities($query, $uf, $limit);
            if ($ibge !== []) {
                return $ibge;
            }
        }

        return $this->searchNominatim($query, $uf !== '' ? $uf : null, $limit);
    }

    /**
     * Lista oficial de municípios por UF (IBGE).
     *
     * @return array<int, array{id:string,label:string,city:string,uf:string}>
     */
    private function searchIbgeMunicipalities(string $query, string $uf, int $limit): array
    {
        $municipalities = $this->ibgeMunicipalitiesForUf($uf);
        if ($municipalities === []) {
            return [];
        }

        $needle = $this->normalizeForCompare($query);
        $matches = [];

        foreach ($municipalities as $row) {
            $name = (string) ($row['nome'] ?? '');
            if ($name === '') {
                continue;
            }
            if (! str_contains($this->normalizeForCompare($name), $needle)) {
                continue;
            }
            $matches[] = [
                'id' => 'ibge-'.($row['id'] ?? md5($name)),
                'label' => $name.' - '.$uf,
                'city' => $name,
                'uf' => $uf,
            ];
        }

        usort($matches, fn (array $a, array $b) => strcasecmp($a['city'], $b['city']));

        return array_slice($matches, 0, $limit);
    }

    /**
     * @return array<int, array{id:int|string,nome:string}>
     */
    private function ibgeMunicipalitiesForUf(string $uf): array
    {
        return Cache::remember('ibge_municipios_'.$uf, 86400, function () use ($uf) {
            $resp = OutboundHttpSsl::apply(Http::timeout(20))
                ->acceptJson()
                ->get('https://servicodados.ibge.gov.br/api/v1/localidades/estados/'.$uf.'/municipios');

            if (! $resp->successful()) {
                Log::warning('IBGE municipios failed', ['uf' => $uf, 'status' => $resp->status()]);

                return [];
            }

            $json = $resp->json();

            return is_array($json) ? $json : [];
        });
    }

    /**
     * @return array<int, array{id:string,label:string,city:string,uf:string}>
     */
    private function searchNominatim(string $query, ?string $uf, int $limit): array
    {
        $nominatimQuery = $uf !== null && $uf !== ''
            ? $query.', '.$uf.', Brasil'
            : $query.', Brasil';

        $resp = OutboundHttpSsl::apply(Http::timeout(10))
            ->withHeaders(['User-Agent' => 'GuerovaScraper/0.2 (+local dev)'])
            ->get('https://nominatim.openstreetmap.org/search', [
                'q' => $nominatimQuery,
                'format' => 'json',
                'addressdetails' => 1,
                'limit' => min(20, max(1, $limit * 2)),
                'countrycodes' => 'br',
            ]);

        if (! $resp->successful()) {
            return [];
        }

        $json = $resp->json();
        if (! is_array($json)) {
            return [];
        }

        $items = [];
        $seen = [];
        foreach ($json as $row) {
            if (! is_array($row)) {
                continue;
            }
            $parsed = $this->mapNominatimRow($row);
            if ($parsed === null) {
                continue;
            }
            if ($uf !== null && $uf !== '' && $parsed['uf'] !== $uf) {
                continue;
            }
            $key = mb_strtolower($parsed['city'].'|'.$parsed['uf'], 'UTF-8');
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $items[] = $parsed;
            if (count($items) >= $limit) {
                break;
            }
        }

        return $items;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array{id:string,label:string,city:string,uf:string}|null
     */
    private function mapNominatimRow(array $row): ?array
    {
        $address = is_array($row['address'] ?? null) ? $row['address'] : [];
        $city = trim((string) (
            $address['city']
            ?? $address['town']
            ?? $address['municipality']
            ?? $address['village']
            ?? $row['name']
            ?? ''
        ));
        if ($city === '') {
            return null;
        }

        $uf = $this->ufFromAddress($address);
        if ($uf === '') {
            return null;
        }

        $id = (string) ($row['place_id'] ?? md5($city.'|'.$uf));

        return [
            'id' => $id,
            'label' => $city.' - '.$uf,
            'city' => $city,
            'uf' => $uf,
        ];
    }

    /**
     * @param  array<string, mixed>  $address
     */
    private function ufFromAddress(array $address): string
    {
        $iso = (string) ($address['ISO3166-2-lvl4'] ?? '');
        if (preg_match('/^BR-([A-Z]{2})$/i', $iso, $m)) {
            return strtoupper($m[1]);
        }

        $state = mb_strtolower(trim((string) ($address['state'] ?? '')), 'UTF-8');

        return self::STATE_NAME_TO_UF[$state] ?? '';
    }

    private function normalizeForCompare(string $text): string
    {
        $text = mb_strtolower($text, 'UTF-8');
        $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);

        return trim(preg_replace('/[^a-z0-9]+/', '', $converted !== false ? $converted : $text) ?? $text);
    }
}
