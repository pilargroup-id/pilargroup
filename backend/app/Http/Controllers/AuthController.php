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
            ->leftJoin('master_job_levels as mjl', 'cu.job_level_id', '=', 'mjl.id')
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
                'cu.job_level_id',
                'mjl.name as job_level',
                'mjl.level as job_level_value',
                'cu.token_version'
            )
            ->where('cu.id', $user->id)
            ->first();

        $apps = $this->getUserApps($user->id);

        return [
            'id'            => $userProfile?->id ?? $user->id,
            'internal_id'   => $userProfile?->internal_id ?? $user->internal_id,
            'username'      => $userProfile?->username ?? $user->username,
            'name'          => $userProfile?->name ?? $user->name,
            'email'         => $userProfile?->email ?? $user->email,
            'phone'         => $userProfile?->phone ?? $user->phone,
            'department_id' => $userProfile?->department_id ?? $user->department_id ?? null,
            'department'    => $userProfile?->department ?? null,
            'job_position'  => $userProfile?->job_position ?? $user->job_position,
            'job_level'     => $userProfile?->job_level ?? $user->job_level,
            'apps'          => $apps,
            'cv'            => $userProfile?->token_version ?? $user->token_version,
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

        if ($request->filled('sso_token')) {
            try {
                $ssoClaims = (array) JWT::decode(
                    $request->sso_token,
                    new Key(config('jwt.secret'), 'HS256')
                );

                if (($ssoClaims['purpose'] ?? '') !== 'sso_context') {
                    return response()->json(['message' => 'SSO token tidak valid.'], 401);
                }

                if (($ssoClaims['exp'] ?? 0) < now()->timestamp) {
                    return response()->json(['message' => 'SSO token sudah expired.'], 401);
                }

                $redirectUrl = app(SSOController::class)->issueAndRedirect($user, $ssoClaims);

                return response()->json(['redirect' => $redirectUrl]);

            } catch (\Exception $e) {
                return response()->json(['message' => 'SSO token tidak valid.'], 401);
            }
        }

        $authUser = $this->buildAuthUserPayload($user);

        $token = JWTAuth::claims([
            'department_id' => $authUser['department_id'],
            'department' => $authUser['department'],
            'apps' => $authUser['apps'],
            'cv' => $user->token_version,
        ])->fromUser($user);

        return response()->json([
            'token' => $token,
            'user'  => $authUser,
        ]);
    }

    // GET /api/auth/status
    // Dipanggil sub-projects untuk polling validitas token
    public function status(Request $request)
    {
        $userId  = $request->user_id;
        $cvFromToken = $request->auth_cv;

        $user = DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $userId)
            ->where('is_active', 1)
            ->select('token_version')
            ->first();

        if (!$user) {
            return response()->json(['valid' => false], 200);
        }

        $valid = $cvFromToken !== null && (int)$cvFromToken === (int)$user->token_version;

        return response()->json([
            'valid'         => $valid,
            'token_version' => (int)$user->token_version,
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
        $userId = request()->user_id;

        // Increment token_version → semua sub-project akan detect via polling
        DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $userId)
            ->increment('token_version');

        JWTAuth::invalidate(JWTAuth::getToken());

        return response()->json(['message' => 'Logged out successfully']);
    }
}
