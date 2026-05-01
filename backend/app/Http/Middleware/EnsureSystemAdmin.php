<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureSystemAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (! $user || ! $user->is_system_admin) {
            return response()->json(['ok' => false, 'error' => 'Acesso restrito ao admin do sistema.'], 403);
        }

        return $next($request);
    }
}
