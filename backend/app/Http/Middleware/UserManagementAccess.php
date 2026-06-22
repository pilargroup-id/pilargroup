<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserManagementAccess
{
    private const DEPARTMENT_HCGA_ID = 1;
    private const DEPARTMENT_IT_ID = 8;

    public function handle(Request $request, Closure $next)
    {
        $userId = $request->user_id;

        if (!$userId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $departmentIds = DB::connection('pilargroup')
            ->table('central_user_departments')
            ->where('user_id', $userId)
            ->pluck('department_id')
            ->map(fn ($id) => (int) $id)
            ->toArray();

        $isIT = in_array(self::DEPARTMENT_IT_ID, $departmentIds, true);
        $isHCGA = in_array(self::DEPARTMENT_HCGA_ID, $departmentIds, true);

        if (!$isIT && !$isHCGA) {
            return response()->json([
                'message' => 'Access denied. IT or HCGA department only.',
            ], 403);
        }

        $request->merge([
            'auth_department_ids' => $departmentIds,
            'auth_is_it' => $isIT,
            'auth_is_hcga' => $isHCGA,
        ]);

        return $next($request);
    }
}