<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AccountController extends Controller
{
    public function myAccounts(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $accounts = $user->accounts()
            ->get(['accounts.id', 'accounts.name', 'accounts.slug', 'account_user.role'])
            ->map(fn ($a) => [
                'id' => $a->id,
                'name' => $a->name,
                'slug' => $a->slug,
                'role' => (string) ($a->pivot?->role ?? ''),
            ])
            ->values();

        return response()->json(['ok' => true, 'accounts' => $accounts]);
    }

    public function adminList(): JsonResponse
    {
        $accounts = Account::query()
            ->orderBy('id', 'desc')
            ->limit(200)
            ->get(['id', 'name', 'slug', 'created_at'])
            ->values();

        return response()->json(['ok' => true, 'accounts' => $accounts]);
    }

    public function adminCreate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:120'],
        ]);

        $name = trim($data['name']);
        $slug = trim((string) ($data['slug'] ?? ''));
        if ($slug === '') {
            $slug = Str::slug($name);
        }

        $account = Account::query()->create([
            'name' => $name,
            'slug' => $slug,
        ]);

        return response()->json(['ok' => true, 'account' => $account], 201);
    }
}
