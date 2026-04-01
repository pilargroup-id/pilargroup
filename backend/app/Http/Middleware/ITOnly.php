<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ITOnly
{
    public function handle(Request $request, Closure $next)
    {
        $department = $request->department;

        if ($department !== 'IT') {
            return response()->json(['message' => 'Access denied. IT division only.'], 403);
        }

        return $next($request);
    }
}