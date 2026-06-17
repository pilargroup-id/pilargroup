<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyInternalSyncSecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $incomingSecret = $request->header('X-Internal-Secret');
        $validSecret = config('services.ticket.internal_secret');

        if (!$incomingSecret || !$validSecret || !hash_equals((string) $validSecret, (string) $incomingSecret)) {
            return response()->json([
                'message' => 'Unauthorized internal request',
            ], 401);
        }

        return $next($request);
    }
}