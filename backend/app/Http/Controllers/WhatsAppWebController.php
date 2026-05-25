<?php

namespace App\Http\Controllers;

use App\Services\WhatsAppBridgeClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Throwable;

class WhatsAppWebController extends Controller
{
    public function __construct(
        private readonly WhatsAppBridgeClient $bridge
    ) {}

    public function status(): JsonResponse
    {
        if (! $this->bridge->isEnabled()) {
            return response()->json([
                'provider' => 'whatsapp_web',
                'enabled' => false,
                'bridge_online' => false,
                'bridge_url' => null,
                'status' => 'disabled',
                'message' => 'Defina WHATSAPP_WEB_BRIDGE_URL=http://127.0.0.1:3100 no backend/.env e inicie o serviço whatsapp-bridge.',
            ]);
        }

        try {
            $this->bridge->health();
            $session = $this->bridge->session();
        } catch (Throwable $e) {
            return response()->json([
                'provider' => 'whatsapp_web',
                'enabled' => true,
                'bridge_online' => false,
                'bridge_url' => $this->bridge->baseUrl(),
                'status' => 'offline',
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'provider' => 'whatsapp_web',
            'enabled' => true,
            'bridge_online' => true,
            'bridge_url' => $this->bridge->baseUrl(),
            'status' => $session['status'] ?? 'disconnected',
            'qr' => $session['qr'] ?? null,
            'qrImage' => $session['qrImage'] ?? null,
            'user' => $session['user'] ?? null,
            'lastError' => $session['lastError'] ?? null,
        ]);
    }

    public function connect(): JsonResponse
    {
        try {
            $session = $this->bridge->connect();
        } catch (Throwable $e) {
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ], 502);
        }

        return response()->json([
            'ok' => true,
            'status' => $session['status'] ?? null,
            'qr' => $session['qr'] ?? null,
            'qrImage' => $session['qrImage'] ?? null,
            'user' => $session['user'] ?? null,
            'lastError' => $session['lastError'] ?? null,
        ]);
    }

    public function disconnect(): JsonResponse
    {
        try {
            $session = $this->bridge->disconnect();
        } catch (Throwable $e) {
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ], 502);
        }

        return response()->json([
            'ok' => true,
            'status' => $session['status'] ?? 'disconnected',
        ]);
    }

    public function chats(): JsonResponse
    {
        try {
            $payload = $this->bridge->chats();
        } catch (Throwable $e) {
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
                'chats' => [],
            ], 503);
        }

        return response()->json([
            'ok' => true,
            'chats' => $payload['chats'] ?? [],
        ]);
    }

    public function messages(Request $request, string $jid): JsonResponse
    {
        $validated = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        try {
            $payload = $this->bridge->chatMessages(
                urldecode($jid),
                (int) ($validated['limit'] ?? 80)
            );
        } catch (Throwable $e) {
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
                'messages' => [],
            ], 503);
        }

        return response()->json([
            'ok' => true,
            'jid' => $payload['jid'] ?? urldecode($jid),
            'messages' => $payload['messages'] ?? [],
        ]);
    }

    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'to' => ['required_without:jid', 'string', 'max:128'],
            'jid' => ['required_without:to', 'string', 'max:128'],
            'message' => ['required', 'string', 'max:4096'],
            'name' => ['nullable', 'string', 'max:120'],
        ]);

        $target = (string) ($validated['jid'] ?? $validated['to']);

        try {
            $result = $this->bridge->sendText(
                $target,
                $validated['message'],
                $validated['name'] ?? null
            );
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

    public function messageMedia(string $jid, string $messageId): Response|JsonResponse
    {
        try {
            $response = $this->bridge->messageMediaBinary(urldecode($jid), urldecode($messageId));
        } catch (Throwable $e) {
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ], 503);
        }

        if (! $response->successful()) {
            return response()->json([
                'ok' => false,
                'error' => 'Media não encontrada.',
            ], $response->status());
        }

        $contentType = $response->header('Content-Type') ?? 'image/jpeg';

        return response($response->body(), 200, [
            'Content-Type' => is_array($contentType) ? ($contentType[0] ?? 'image/jpeg') : $contentType,
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }

    public function sendImage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'to' => ['required_without:jid', 'string', 'max:128'],
            'jid' => ['required_without:to', 'string', 'max:128'],
            'image' => ['required', 'string'],
            'mimetype' => ['required', 'string', 'max:128'],
            'caption' => ['nullable', 'string', 'max:4096'],
            'name' => ['nullable', 'string', 'max:120'],
        ]);

        $target = (string) ($validated['jid'] ?? $validated['to']);

        try {
            $result = $this->bridge->sendImage(
                $target,
                $validated['image'],
                $validated['mimetype'],
                $validated['caption'] ?? null,
                $validated['name'] ?? null
            );
        } catch (Throwable $e) {
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ], 502);
        }

        return response()->json([
            'ok' => true,
            'whatsapp' => $result['sent'] ?? $result,
        ]);
    }

    public function renameChat(Request $request, string $jid): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        try {
            $result = $this->bridge->renameChat(urldecode($jid), $validated['name']);
        } catch (Throwable $e) {
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ], 502);
        }

        return response()->json([
            'ok' => true,
            'chat' => $result['chat'] ?? null,
        ]);
    }
}
