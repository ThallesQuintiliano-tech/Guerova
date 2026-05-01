<?php

use App\Http\Middleware\EnsureSystemAdmin;
use App\Http\Middleware\EnsureWhatsAppBridgeSecret;
use App\Http\Middleware\ResolveAccount;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'whatsapp.bridge' => EnsureWhatsAppBridgeSecret::class,
            'system.admin' => EnsureSystemAdmin::class,
            'account.resolve' => ResolveAccount::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
