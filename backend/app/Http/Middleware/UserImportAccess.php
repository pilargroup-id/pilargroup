<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserImportAccess
{
    private const HC_ADMIN_JOB_LEVEL_VALUE = 1;
    private const HC_ADMIN_JOB_POSITION = 'Admin Human Capital';

    public function handle(Request $request, Closure $next)
    {
        $userId = $request->user_id;

        if (!$userId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $isIT = DB::connection('pilargroup')
            ->table('central_user_departments as cud')
            ->join('master_departments as md', 'cud.department_id', '=', 'md.id')
            ->where('cud.user_id', $userId)
            ->where('md.code', 'SIT')
            ->exists();

        $user = DB::connection('pilargroup')
            ->table('central_users as cu')
            ->leftJoin('master_job_levels as mjl', 'cu.job_level_id', '=', 'mjl.id')
            ->where('cu.id', $userId)
            ->select('cu.job_position', 'mjl.level as job_level_value')
            ->first();

        $isHumanCapitalAdmin = $user
            && (int) $user->job_level_value === self::HC_ADMIN_JOB_LEVEL_VALUE
            && strcasecmp(trim((string) $user->job_position), self::HC_ADMIN_JOB_POSITION) === 0;

        if (!$isIT && !$isHumanCapitalAdmin) {
            return response()->json([
                'message' => 'Access denied. User import is limited to IT or Admin Human Capital.',
            ], 403);
        }

        $request->merge([
            'auth_import_is_it' => $isIT,
            'auth_import_is_human_capital_admin' => $isHumanCapitalAdmin,
            'auth_import_can_manage_apps' => $isIT,
        ]);

        return $next($request);
    }
}
