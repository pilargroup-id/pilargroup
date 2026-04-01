<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\TokenExpiredException;
use Tymon\JWTAuth\Exceptions\TokenInvalidException;
use Tymon\JWTAuth\Exceptions\JWTException;

class AuthMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        try {
            $payload = JWTAuth::parseToken()->getPayload();

            // Tidak perlu cek apps, cukup token valid
            $request->merge([
                'auth_user'    => $payload->toArray(),
                'user_id'      => $payload->get('sub'),
                'internal_id'  => $payload->get('internal_id'),
                'username'     => $payload->get('username'),
                'name'         => $payload->get('name'),
                'department'   => $payload->get('department'),
                'apps'         => $payload->get('apps') ?? [],
            ]);

        } catch (TokenExpiredException $e) {
            return response()->json(['message' => 'Token expired'], 401);
        } catch (TokenInvalidException $e) {
            return response()->json(['message' => 'Token invalid'], 401);
        } catch (JWTException $e) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        return $next($request);
    }
}