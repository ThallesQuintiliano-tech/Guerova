<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class MetaAdsClient
{
    public function __construct(
        private readonly string $accessToken,
        private readonly string $graphVersion,
    ) {
        $this->accessToken = trim($this->accessToken);
        $this->graphVersion = trim($this->graphVersion) !== '' ? trim($this->graphVersion) : 'v21.0';

        if ($this->accessToken === '') {
            throw new RuntimeException('Meta Ads access token não configurado.');
        }
    }

    private function http(): PendingRequest
    {
        return Http::baseUrl('https://graph.facebook.com/'.$this->graphVersion)
            ->acceptJson()
            ->asForm()
            ->timeout(30);
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    public function get(string $path, array $params = []): array
    {
        $res = $this->http()->get($this->normalizePath($path), $this->withToken($params));

        return $this->decodeOrThrow($res);
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    public function post(string $path, array $params = []): array
    {
        $res = $this->http()->post($this->normalizePath($path), $this->withToken($params));

        return $this->decodeOrThrow($res);
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    public function createCampaign(string $adAccountId, array $params): array
    {
        $adAccountId = $this->normalizeAdAccountId($adAccountId);

        return $this->post('/'.$adAccountId.'/campaigns', $params);
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    public function createAdSet(string $adAccountId, array $params): array
    {
        $adAccountId = $this->normalizeAdAccountId($adAccountId);

        return $this->post('/'.$adAccountId.'/adsets', $params);
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    public function createCreative(string $adAccountId, array $params): array
    {
        $adAccountId = $this->normalizeAdAccountId($adAccountId);

        return $this->post('/'.$adAccountId.'/adcreatives', $params);
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    public function createAd(string $adAccountId, array $params): array
    {
        $adAccountId = $this->normalizeAdAccountId($adAccountId);

        return $this->post('/'.$adAccountId.'/ads', $params);
    }

    /**
     * Envia imagem para a biblioteca da ad account; a Meta devolve {@see self::imageHashFromAdImagesResponse}.
     *
     * @return array<string, mixed> resposta bruta da Graph API (chave {@code images})
     */
    public function uploadAdImage(string $adAccountId, string $fileContents, string $clientFilename): array
    {
        $adAccountId = $this->normalizeAdAccountId($adAccountId);
        $url = 'https://graph.facebook.com/'.$this->graphVersion.$this->normalizePath('/'.$adAccountId.'/adimages');

        $res = Http::timeout(120)
            ->asMultipart()
            ->post($url, [
                ['name' => 'access_token', 'contents' => $this->accessToken],
                ['name' => 'filename', 'contents' => $fileContents, 'filename' => $clientFilename],
            ]);

        return $this->decodeOrThrow($res);
    }

    /**
     * @param  array<string, mixed>  $resp
     */
    public static function imageHashFromAdImagesResponse(array $resp): string
    {
        $images = $resp['images'] ?? null;
        if (! is_array($images) || $images === []) {
            throw new RuntimeException('Resposta da Meta sem images (upload de imagem).');
        }

        $first = reset($images);
        if (is_array($first)) {
            $hash = trim((string) ($first['hash'] ?? ''));
            if ($hash !== '') {
                return $hash;
            }
        }

        $key = (string) key($images);
        $key = trim($key);

        return $key !== '' ? $key : throw new RuntimeException('Não foi possível obter image_hash da resposta da Meta.');
    }

    private function normalizePath(string $path): string
    {
        $path = trim($path);
        if ($path === '') {
            return '/';
        }
        return str_starts_with($path, '/') ? $path : '/'.$path;
    }

    private function normalizeAdAccountId(string $adAccountId): string
    {
        $id = trim($adAccountId);
        if ($id === '') {
            throw new RuntimeException('Ad account id vazio.');
        }
        return str_starts_with($id, 'act_') ? $id : 'act_'.$id;
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    private function withToken(array $params): array
    {
        $params['access_token'] = $this->accessToken;

        return $params;
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeOrThrow(Response $res): array
    {
        $json = $res->json();
        if (is_array($json) && $res->successful()) {
            return $json;
        }

        $body = $res->body();
        $err = is_array($json) ? ($json['error']['message'] ?? null) : null;
        $status = $res->status();

        throw new RuntimeException('Meta Graph API error (HTTP '.$status.'): '.($err ?: $body));
    }

    /**
     * @return array<string, mixed>
     */
    public static function safeError(Throwable $e): array
    {
        return [
            'ok' => false,
            'error' => $e->getMessage(),
        ];
    }
}

