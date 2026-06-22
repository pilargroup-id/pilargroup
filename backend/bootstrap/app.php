<?php

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
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'auth.central' => \App\Http\Middleware\AuthMiddleware::class,
            'it.only'      => \App\Http\Middleware\ITOnly::class,
            'internal.sync' => \App\Http\Middleware\VerifyInternalSyncSecret::class,
            'user.management.access' => \App\Http\Middleware\UserManagementAccess::class,
        ]);
        $middleware->append(\Illuminate\Http\Middleware\HandleCors::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
