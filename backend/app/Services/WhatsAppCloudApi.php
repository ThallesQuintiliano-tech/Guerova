<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class WhatsAppCloudApi
{
    public function isConfigured(): bool
    {
        return (bool) config('whatsapp.access_token') && (bool) config('whatsapp.phone_number_id');
    }

    /**
     * @return array<string, mixed>
     */
    public function sendHelloWorldTemplate(string $toDigitsOnly): array
    {
        $this->assertConfigured();

        return $this->postMessage([
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $toDigitsOnly,
            'type' => 'template',
            'template' => [
                'name' => 'hello_world',
                'language' => [
                    'code' => 'en_US',
                ],
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function sendText(string $toDigitsOnly, string $body): array
    {
        $this->assertConfigured();

        return $this->postMessage([
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $toDigitsOnly,
            'type' => 'text',
            'text' => [
                'preview_url' => false,
                'body' => $body,
            ],
        ]);
    }

    private function assertConfigured(): void
    {
        if ($this->isConfigured()) {
            return;
        }

        $missing = [];
        if (! trim((string) config('whatsapp.access_token'))) {
            $missing[] = 'WHATSAPP_ACCESS_TOKEN';
        }
        if (! trim((string) config('whatsapp.phone_number_id'))) {
            $missing[] = 'WHATSAPP_PHONE_NUMBER_ID';
        }
        throw new RuntimeException(
            'Falta no backend/.env: '.implode(' e ', $missing).'. '
            .'Na Meta: developers.facebook.com → a tua app → WhatsApp → API Setup: copia o token de acesso e o ID do número de telefone (Phone number ID). Reinicia o Laravel depois de guardar o .env.'
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function postMessage(array $payload): array
    {
        $token = (string) config('whatsapp.access_token');
        $phoneId = (string) config('whatsapp.phone_number_id');
        $version = (string) config('whatsapp.graph_version');
        $url = sprintf('https://graph.facebook.com/%s/%s/messages', $version, $phoneId);

        $response = Http::withToken($token)
            ->acceptJson()
            ->post($url, $payload);

        if (! $response->successful()) {
            $json = $response->json();
            Log::warning('WhatsApp Cloud API error', [
                'status' => $response->status(),
                'body' => $json,
            ]);

            $message = is_array($json) ? data_get($json, 'error.message', 'WhatsApp API request failed') : 'WhatsApp API request failed';

            throw new RuntimeException((string) $message);
        }

        /** @var array<string, mixed> */
        return $response->json();
    }

    public function verifyWebhookChallenge(Request $request): ?string
    {
        /** @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests */
        $mode = $request->query('hub.mode') ?? $request->query('hub_mode');
        $token = $request->query('hub.verify_token') ?? $request->query('hub_verify_token');
        $challenge = $request->query('hub.challenge') ?? $request->query('hub_challenge');

        $expected = (string) config('whatsapp.verify_token');
        if ($expected === '' || $mode !== 'subscribe' || $token === null || $challenge === null) {
            return null;
        }

        if (! hash_equals($expected, (string) $token)) {
            return null;
        }

        return (string) $challenge;
    }

    public function webhookSignatureValid(string $rawBody, ?string $signatureHeader): bool
    {
        $secret = (string) config('whatsapp.app_secret');
        if ($secret === '') {
            if (app()->environment('local')) {
                Log::warning('WhatsApp webhook: WHATSAPP_APP_SECRET empty; accepting payload only in local environment.');

                return true;
            }

            return false;
        }

        if ($signatureHeader === null || ! str_starts_with($signatureHeader, 'sha256=')) {
            return false;
        }

        $expected = 'sha256='.hash_hmac('sha256', $rawBody, $secret);

        return hash_equals($expected, $signatureHeader);
    }
}
