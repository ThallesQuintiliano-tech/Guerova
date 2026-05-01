<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'deviceName' => ['nullable', 'string', 'max:120'],
        ]);

        /** @var User|null $user */
        $user = User::query()->where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciais inválidas.'],
            ]);
        }

        $tokenName = (string) ($data['deviceName'] ?? 'web');
        $token = $user->createToken($tokenName);

        $accounts = $user->accounts()
            ->get(['accounts.id', 'accounts.name', 'accounts.slug', 'account_user.role'])
            ->map(fn ($a) => [
                'id' => $a->id,
                'name' => $a->name,
                'slug' => $a->slug,
                'role' => (string) ($a->pivot?->role ?? ''),
            ])
            ->values();

        return response()->json([
            'ok' => true,
            'token' => $token->plainTextToken,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'isSystemAdmin' => (bool) $user->is_system_admin,
            ],
            'accounts' => $accounts,
        ]);
    }

    public function me(Request $request): JsonResponse
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

        return response()->json([
            'ok' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'isSystemAdmin' => (bool) $user->is_system_admin,
            ],
            'accounts' => $accounts,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->currentAccessToken()?->delete();

        return response()->json(['ok' => true]);
    }
}
