<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Services\CampaignPackFallback;
use App\Services\GeminiCampaignPackGenerator;
use App\Services\GeminiErrorMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Throwable;

class CampaignController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $account = $request->attributes->get('account');

        $rows = Campaign::query()
            ->where('account_id', $account->id)
            ->orderByDesc('id')
            ->limit(200)
            ->get([
                'id',
                'account_id',
                'created_by_user_id',
                'name',
                'status',
                'briefing',
                'pack',
                'created_at',
                'updated_at',
            ]);

        return response()->json([
            'ok' => true,
            'campaigns' => $rows,
        ]);
    }

    public function generatePack(Request $request, GeminiCampaignPackGenerator $generator): JsonResponse
    {
        $data = $request->validate([
            'briefing' => ['required', 'array'],
        ]);

        $briefing = $data['briefing'];

        try {
            $result = $generator->generate($briefing);

            return response()->json([
                'ok' => true,
                'source' => 'gemini',
                'model' => $result['model'],
                'pack' => $result['pack'],
            ]);
        } catch (Throwable $e) {
            report($e);

            if (! (bool) config('gemini.fallback_mock', true)) {
                $message = $e instanceof RuntimeException
                    ? $e->getMessage()
                    : 'Falha ao gerar pacote com Gemini.';

                return response()->json([
                    'ok' => false,
                    'error' => $message,
                ], $e instanceof RuntimeException && str_contains($message, 'GEMINI_API_KEY') ? 503 : 502);
            }

            return response()->json([
                'ok' => true,
                'source' => 'mock_fallback',
                'pack' => CampaignPackFallback::fromBriefing($briefing),
                'warning' => GeminiErrorMessage::friendly($e),
            ]);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $account = $request->attributes->get('account');
        $user = $request->user();

        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:190'],
            'status' => ['nullable', 'string', 'max:30'],
            'briefing' => ['required', 'array'],
            'pack' => ['required', 'array'],
        ]);

        $name = self::resolveCampaignName($data['name'] ?? null, $data['briefing']);

        $status = strtoupper(trim((string) ($data['status'] ?? 'DRAFT')));
        $allowed = ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'];
        if (! in_array($status, $allowed, true)) {
            $status = 'DRAFT';
        }

        $c = Campaign::query()->create([
            'account_id' => $account->id,
            'created_by_user_id' => $user?->id,
            'name' => $name,
            'status' => $status,
            'briefing' => $data['briefing'],
            'pack' => $data['pack'],
        ]);

        return response()->json([
            'ok' => true,
            'campaign' => $c->fresh(),
        ], 201);
    }

    public function show(Request $request, Campaign $campaign): JsonResponse
    {
        $account = $request->attributes->get('account');
        if ($campaign->account_id !== $account->id) {
            abort(404);
        }

        return response()->json([
            'ok' => true,
            'campaign' => $campaign->fresh(),
        ]);
    }

    public function update(Request $request, Campaign $campaign): JsonResponse
    {
        $account = $request->attributes->get('account');
        if ($campaign->account_id !== $account->id) {
            abort(404);
        }

        $data = $request->validate([
            'status' => ['sometimes', 'string', 'max:30'],
            'name' => ['sometimes', 'string', 'max:190'],
            'briefing' => ['sometimes', 'array'],
            'pack' => ['sometimes', 'array'],
        ]);

        if ($data === []) {
            return response()->json([
                'ok' => false,
                'error' => 'Nenhum campo para atualizar.',
            ], 422);
        }

        if (array_key_exists('name', $data) || array_key_exists('briefing', $data)) {
            $briefing = array_key_exists('briefing', $data)
                ? $data['briefing']
                : (is_array($campaign->briefing) ? $campaign->briefing : []);
            $campaign->name = self::resolveCampaignName($data['name'] ?? $campaign->name, $briefing);
        }

        if (array_key_exists('briefing', $data)) {
            $campaign->briefing = $data['briefing'];
        }

        if (array_key_exists('pack', $data)) {
            $campaign->pack = $data['pack'];
        }

        if (array_key_exists('status', $data)) {
            $status = strtoupper(trim((string) $data['status']));
            $allowed = ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'];
            if (! in_array($status, $allowed, true)) {
                return response()->json([
                    'ok' => false,
                    'error' => 'Status inválido.',
                ], 422);
            }
            $campaign->status = $status;
        }

        $campaign->save();

        return response()->json([
            'ok' => true,
            'campaign' => $campaign->fresh(),
        ]);
    }

    public function destroy(Request $request, Campaign $campaign): JsonResponse
    {
        $account = $request->attributes->get('account');
        if ($campaign->account_id !== $account->id) {
            abort(404);
        }

        $campaign->delete();

        return response()->json([
            'ok' => true,
            'deleted' => true,
        ]);
    }

    /**
     * @param  array<string, mixed>  $briefing
     */
    private static function resolveCampaignName(mixed $name, array $briefing): string
    {
        $name = trim((string) ($name ?? ''));
        if ($name !== '') {
            return $name;
        }

        foreach (['campaignName', 'propertyName', 'propertyTitle'] as $key) {
            $v = trim((string) ($briefing[$key] ?? ''));
            if ($v !== '') {
                return $v;
            }
        }

        return 'Campanha';
    }
}

