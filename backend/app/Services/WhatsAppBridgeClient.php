<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class WhatsAppBridgeClient
{
    public function isEnabled(): bool
    {
        return trim((string) config('whatsapp.web_bridge_url')) !== '';
    }

    public function baseUrl(): string
    {
        return rtrim((string) config('whatsapp.web_bridge_url'), '/');
    }

    /**
     * @return array<string, mixed>
     */
    public function health(): array
    {
        return $this->request('get', '/health');
    }

    /**
     * @return array<string, mixed>
     */
    public function session(): array
    {
        return $this->request('get', '/session');
    }

    /**
     * @return array<string, mixed>
     */
    public function connect(): array
    {
        return $this->request('post', '/session/connect');
    }

    /**
     * @return array<string, mixed>
     */
    public function disconnect(): array
    {
        return $this->request('post', '/session/disconnect');
    }

    /**
     * @return array<string, mixed>
     */
    public function sendText(string $to, string $message, ?string $name = null): array
    {
        $body = [
            'to' => $to,
            'message' => $message,
        ];
        if ($name !== null && trim($name) !== '') {
            $body['name'] = trim($name);
        }

        return $this->request('post', '/messages/send', $body);
    }

    /**
     * @return array<string, mixed>
     */
    public function chats(): array
    {
        return $this->request('get', '/chats', [], 45);
    }

    /**
     * @return array<string, mixed>
     */
    public function chatMessages(string $jid, int $limit = 80): array
    {
        $encoded = rawurlencode($jid);

        return $this->request('get', '/chats/'.$encoded.'/messages?limit='.$limit);
    }

    /**
     * @return array<string, mixed>
     */
    public function renameChat(string $jid, string $name): array
    {
        $encoded = rawurlencode($jid);

        return $this->request('patch', '/chats/'.$encoded, ['name' => trim($name)]);
    }

    /**
     * @return array<string, mixed>
     */
    public function sendImage(
        string $to,
        string $imageBase64,
        string $mimetype,
        ?string $caption = null,
        ?string $name = null
    ): array {
        $body = [
            'to' => $to,
            'image' => $imageBase64,
            'mimetype' => $mimetype,
        ];
        if ($caption !== null && trim($caption) !== '') {
            $body['caption'] = trim($caption);
        }
        if ($name !== null && trim($name) !== '') {
            $body['name'] = trim($name);
        }

        return $this->request('post', '/messages/send-image', $body, 120);
    }

    public function messageMediaBinary(string $jid, string $messageId): \Illuminate\Http\Client\Response
    {
        if (! $this->isEnabled()) {
            throw new RuntimeException('Serviço WhatsApp Web não configurado.');
        }

        $url = $this->baseUrl().'/chats/'.rawurlencode($jid).'/messages/'.rawurlencode($messageId).'/media';
        $pending = Http::timeout(60)->acceptJson();
        $secret = (string) config('whatsapp.bridge_secret');
        if ($secret !== '') {
            $pending = $pending->withHeaders(['X-Guerova-Secret' => $secret]);
        }

        return $pending->get($url);
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    /**
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    private function request(string $method, string $path, array $body = [], ?int $timeoutSeconds = null): array
    {
        if (! $this->isEnabled()) {
            throw new RuntimeException(
                'Serviço WhatsApp Web não configurado. Defina WHATSAPP_WEB_BRIDGE_URL no backend/.env e inicie o whatsapp-bridge (npm start em whatsapp-bridge/).'
            );
        }

        $url = $this->baseUrl().$path;
        $timeout = $timeoutSeconds ?? (int) config('whatsapp.web_bridge_timeout', 30);
        $pending = Http::timeout($timeout)
            ->acceptJson();

        $secret = (string) config('whatsapp.bridge_secret');
        if ($secret !== '') {
            $pending = $pending->withHeaders(['X-Guerova-Secret' => $secret]);
        }

        try {
            $response = match ($method) {
                'get' => $pending->get($url),
                'patch' => $pending->patch($url, $body),
                default => $pending->post($url, $body),
            };
        } catch (ConnectionException $e) {
            throw new RuntimeException(
                'Não foi possível contactar o whatsapp-bridge em '.$this->baseUrl().'. Execute: cd whatsapp-bridge && npm install && npm start',
                0,
                $e
            );
        }

        /** @var array<string, mixed>|null $json */
        $json = $response->json();

        if (! $response->successful()) {
            $message = is_array($json)
                ? (string) ($json['error'] ?? 'whatsapp-bridge request failed')
                : 'whatsapp-bridge request failed';

            throw new RuntimeException($message);
        }

        return is_array($json) ? $json : ['ok' => true];
    }
}
