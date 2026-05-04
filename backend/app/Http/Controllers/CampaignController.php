<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            $name = trim((string) ($data['briefing']['propertyTitle'] ?? ''));
        }
        if ($name === '') {
            $name = 'Campanha';
        }

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
            'status' => ['required', 'string', 'max:30'],
        ]);

        $status = strtoupper(trim((string) $data['status']));
        $allowed = ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'];
        if (! in_array($status, $allowed, true)) {
            return response()->json([
                'ok' => false,
                'error' => 'Status inválido.',
            ], 422);
        }

        $campaign->status = $status;
        $campaign->save();

        return response()->json([
            'ok' => true,
            'campaign' => $campaign->fresh(),
        ]);
    }
}

