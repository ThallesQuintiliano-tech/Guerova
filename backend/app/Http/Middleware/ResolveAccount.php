<?php

namespace App\Http\Middleware;

use App\Models\Account;
use Closure;
use Illuminate\Http\Request;

class ResolveAccount
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['ok' => false, 'error' => 'Não autenticado.'], 401);
        }

        $accountId = $request->header('X-Account-Id') ?? $request->query('accountId');
        if (! $accountId) {
            return response()->json(['ok' => false, 'error' => 'Informe a conta (X-Account-Id).'], 400);
        }

        /** @var Account|null $account */
        $account = Account::query()->find($accountId);
        if (! $account) {
            return response()->json(['ok' => false, 'error' => 'Conta não encontrada.'], 404);
        }

        $role = $user->accounts()
            ->where('accounts.id', $account->id)
            ->pluck('account_user.role')
            ->first();

        if (! $role) {
            return response()->json(['ok' => false, 'error' => 'Você não tem acesso a esta conta.'], 403);
        }

        // Disponibiliza no request para controllers/serviços
        $request->attributes->set('account', $account);
        $request->attributes->set('accountRole', (string) $role);

        return $next($request);
    }
}
