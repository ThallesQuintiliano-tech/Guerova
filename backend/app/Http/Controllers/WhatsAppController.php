<?php

namespace App\Http\Controllers;

use App\Services\WhatsAppCloudApi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Throwable;

class WhatsAppController extends Controller
{
    public function __construct(
        private readonly WhatsAppCloudApi $whatsapp
    ) {}

    public function status(): JsonResponse
    {
        $appSecret = (string) config('whatsapp.app_secret');
        $bridgeSecret = (string) config('whatsapp.bridge_secret');

        return response()->json([
            'provider' => 'meta_cloud_api',
            'configured' => $this->whatsapp->isConfigured(),
            'webhook_verify_token_set' => (bool) config('whatsapp.verify_token'),
            'app_secret_set' => $appSecret !== '',
            /** Em local, webhook aceita payload sem assinatura se o App Secret estiver vazio (só para dev). */
            'app_secret_skipped_local' => app()->environment('local') && $appSecret === '',
            /** Em local, não exigimos X-Guerova-Secret para facilitar testes. */
            'bridge_secret_required' => ! app()->environment('local'),
            'bridge_secret_set' => $bridgeSecret !== '',
            'graph_version' => config('whatsapp.graph_version'),
        ]);
    }

    public function verify(Request $request): Response
    {
        $challenge = $this->whatsapp->verifyWebhookChallenge($request);
        if ($challenge === null) {
            abort(403, 'Verification failed');
        }

        return response($challenge, 200)->header('Content-Type', 'text/plain');
    }

    public function webhook(Request $request): JsonResponse
    {
        $raw = $request->getContent();
        if (! $this->whatsapp->webhookSignatureValid($raw, $request->header('X-Hub-Signature-256'))) {
            abort(403, 'Invalid signature');
        }

        Log::info('WhatsApp webhook payload', ['data' => $request->all()]);

        return response()->json(['success' => true]);
    }

    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'to' => ['required', 'string', 'regex:/^[0-9]{10,15}$/'],
            'mode' => ['nullable', 'string', 'in:text,hello_world_template'],
            'message' => ['nullable', 'string', 'max:4096'],
        ]);

        if (($validated['mode'] ?? 'text') === 'text' && trim((string) ($validated['message'] ?? '')) === '') {
            return response()->json([
                'ok' => false,
                'error' => 'Para mode=text, envie message.',
            ], 422);
        }

        try {
            $mode = $validated['mode'] ?? 'text';
            $result = $mode === 'hello_world_template'
                ? $this->whatsapp->sendHelloWorldTemplate($validated['to'])
                : $this->whatsapp->sendText($validated['to'], (string) ($validated['message'] ?? ''));
        } catch (Throwable $e) {
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ], 502);
        }

        return response()->json([
            'ok' => true,
            'whatsapp' => $result,
        ]);
    }
}
