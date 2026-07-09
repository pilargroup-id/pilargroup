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
            ->leftJoin('master_job_levels as mjl', 'cu.job_level_id', '=', 'mjl.id')
            ->select(
                'cu.id',
                'cu.internal_id',
                'cu.username',
                'cu.name',
                'cu.email',
                'cu.phone',
                'cu.job_position',
                'cu.job_level_id',
                'mjl.name as job_level',
                'mjl.level as job_level_value',
                'cu.token_version'
            )
            ->where('cu.id', $user->id)
            ->first();

        // Multi-department + parent/class context
        $departments = DB::connection('pilargroup')
            ->table('central_user_departments as cud')
            ->join('master_departments as md', 'cud.department_id', '=', 'md.id')
            ->leftJoin('master_departments as parent_md', 'md.parent_id', '=', 'parent_md.id')
            ->where('cud.user_id', $user->id)
            ->select(
                'md.id',
                'md.name',
                'md.class',
                'md.code',
                'md.parent_id',
                'parent_md.id as parent_department_id',
                'parent_md.name as parent_department_name',
                'parent_md.class as parent_department_class',
                'parent_md.code as parent_department_code',
                'cud.is_primary'
            )
            ->get()
            ->map(function ($department) {
                $isChildDepartment = !empty($department->parent_id);

                return [
                    // Existing fields - keep backward compatible
                    'id' => $department->id,
                    'name' => $department->name,
                    'class' => $department->class,
                    'code' => $department->code,
                    'is_primary' => $department->is_primary,

                    // Parent info - additive
                    'parent_id' => $department->parent_id,
                    'parent_name' => $department->parent_department_name,
                    'parent_class' => $department->parent_department_class,
                    'parent_code' => $department->parent_department_code,

                    // Department context for apps that need parent/class split
                    // If md is child, department = parent, class = child.
                    // If md is parent/no child, department = md, class = md.
                    'department_id' => $isChildDepartment
                        ? $department->parent_department_id
                        : $department->id,
                    'department_name' => $isChildDepartment
                        ? $department->parent_department_name
                        : $department->name,
                    'department_class' => $isChildDepartment
                        ? $department->parent_department_class
                        : $department->class,
                    'department_code' => $isChildDepartment
                        ? $department->parent_department_code
                        : $department->code,

                    'class_department_id' => $department->id,
                    'class_name' => $department->name,
                    'class_class' => $department->class,
                    'class_code' => $department->code,
                ];
            })
            ->values()
            ->toArray();

        // Multi-company
        $companies = DB::connection('pilargroup')
            ->table('central_user_companies as cuc')
            ->join('master_companies as mc', 'cuc.company_id', '=', 'mc.id')
            ->where('cuc.user_id', $user->id)
            ->select('mc.id', 'mc.code', 'mc.name', 'cuc.is_primary')
            ->get()
            ->toArray();

        $apps = $this->getUserApps($user->id);

        // Primary department & company untuk backward-compat di JWT claim
        $primaryDept = collect($departments)->firstWhere('is_primary', 1) ?? ($departments[0] ?? null);
        $primaryCompany = collect($companies)->firstWhere('is_primary', 1) ?? ($companies[0] ?? null);

        return [
            'id' => $userProfile?->id ?? $user->id,
            'internal_id' => $userProfile?->internal_id ?? $user->internal_id,
            'username' => $userProfile?->username ?? $user->username,
            'name' => $userProfile?->name ?? $user->name,
            'email' => $userProfile?->email ?? $user->email,
            'phone' => $userProfile?->phone ?? $user->phone,

            'departments' => $departments,
            'companies' => $companies,

            // Existing top-level fields - keep backward compatible
            'department_id' => $primaryDept['id'] ?? null,
            'department' => $primaryDept['name'] ?? null,
            'company_id' => $primaryCompany?->id ?? null,
            'company' => $primaryCompany?->name ?? null,

            // Additive top-level department info
            'department_code' => $primaryDept['code'] ?? null,
            'department_class' => $primaryDept['class'] ?? null,
            'parent_department_id' => $primaryDept['parent_id'] ?? null,
            'parent_department_name' => $primaryDept['parent_name'] ?? null,

            // Additive top-level context for apps like Papertrail
            'context_department_id' => $primaryDept['department_id'] ?? null,
            'context_department_name' => $primaryDept['department_name'] ?? null,
            'context_department_class' => $primaryDept['department_class'] ?? null,
            'context_department_code' => $primaryDept['department_code'] ?? null,
            'class_department_id' => $primaryDept['class_department_id'] ?? null,
            'class_name' => $primaryDept['class_name'] ?? null,
            'class_class' => $primaryDept['class_class'] ?? null,
            'class_code' => $primaryDept['class_code'] ?? null,

            'job_position' => $userProfile?->job_position ?? $user->job_position,
            'job_level' => $userProfile?->job_level ?? null,
            'job_level_value' => $userProfile?->job_level_value ?? null,
            'apps' => $apps,
            'cv' => $userProfile?->token_version ?? $user->token_version,
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
            'department'    => $authUser['department'],
            'company_id'    => $authUser['company_id'],
            'company'       => $authUser['company'],
            'apps'          => $authUser['apps'],
            'cv'            => $user->token_version,
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
