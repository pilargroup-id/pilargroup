<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ITOnly
{
    public function handle(Request $request, Closure $next)
    {
        $userId = $request->user_id;

        // Cek apakah user punya salah satu department dengan code 'SIT' (IT)
        $isIT = DB::connection('pilargroup')
            ->table('central_user_departments as cud')
            ->join('master_departments as md', 'cud.department_id', '=', 'md.id')
            ->where('cud.user_id', $userId)
            ->where('md.code', 'SIT')
            ->exists();

        if (!$isIT) {
            return response()->json(['message' => 'Access denied. IT division only.'], 403);
        }

        return $next($request);
    }
}