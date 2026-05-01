<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::query()
            ->orderByDesc('id')
            ->limit(200)
            ->get(['id', 'name', 'email', 'is_system_admin', 'created_at'])
            ->values();

        return response()->json(['ok' => true, 'users' => $users]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:180', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6', 'max:200'],
            'isSystemAdmin' => ['nullable', 'boolean'],
            'accountId' => ['nullable', 'integer', 'exists:accounts,id'],
            'accountRole' => ['nullable', 'in:account_admin,account_user'],
        ]);

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'is_system_admin' => (bool) ($data['isSystemAdmin'] ?? false),
        ]);

        if (! empty($data['accountId'])) {
            /** @var Account $account */
            $account = Account::query()->findOrFail((int) $data['accountId']);
            $account->users()->syncWithoutDetaching([
                $user->id => ['role' => (string) ($data['accountRole'] ?? 'account_user')],
            ]);
        }

        return response()->json(['ok' => true, 'user' => $user], 201);
    }
}
