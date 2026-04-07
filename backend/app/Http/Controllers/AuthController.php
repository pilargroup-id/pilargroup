<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Models\CentralUser;

class AuthController extends Controller
{
    protected function getUserApps(string $userId): array
    {
        return DB::connection('pilargroup')
            ->table('central_user_projects as cup')
            ->join('master_projects as mp', 'cup.project_id', '=', 'mp.id')
            ->where('cup.user_id', $userId)
            ->whereNotNull('mp.slug')
            ->pluck('mp.slug')
            ->filter()
            ->values()
            ->toArray();
    }

    protected function buildAuthUserPayload(CentralUser $user): array
    {
        $userProfile = DB::connection('pilargroup')
            ->table('central_users as cu')
            ->leftJoin('master_departments as md', 'cu.department_id', '=', 'md.id')
            ->select(
                'cu.id',
                'cu.internal_id',
                'cu.username',
                'cu.name',
                'cu.email',
                'cu.phone',
                'cu.department_id',
                'md.name as department',
                'cu.job_position',
                'cu.job_level'
            )
            ->where('cu.id', $user->id)
            ->first();

        $apps = $this->getUserApps($user->id);

        return [
            'id' => $userProfile?->id ?? $user->id,
            'internal_id' => $userProfile?->internal_id ?? $user->internal_id,
            'username' => $userProfile?->username ?? $user->username,
            'name' => $userProfile?->name ?? $user->name,
            'email' => $userProfile?->email ?? $user->email,
            'phone' => $userProfile?->phone ?? $user->phone,
            'department_id' => $userProfile?->department_id ?? $user->department_id ?? null,
            'department' => $userProfile?->department ?? null,
            'job_position' => $userProfile?->job_position ?? $user->job_position,
            'job_level' => $userProfile?->job_level ?? $user->job_level,
            'apps' => $apps,
        ];
    }

    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required',
            'password' => 'required',
        ]);

        $user = CentralUser::where('username', $request->username)
            ->where('is_active', 1)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $authUser = $this->buildAuthUserPayload($user);

        $token = JWTAuth::claims([
            'department_id' => $authUser['department_id'],
            'department' => $authUser['department'],
            'apps' => $authUser['apps'],
        ])->fromUser($user);

        return response()->json([
            'token' => $token,
            'user'  => $authUser,
        ]);
    }

    public function me(Request $request)
    {
        $user = auth('api')->user();

        if (!$user instanceof CentralUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        return response()->json($this->buildAuthUserPayload($user));
    }

    public function logout()
    {
        JWTAuth::invalidate(JWTAuth::getToken());
        return response()->json(['message' => 'Logged out successfully']);
    }
}
