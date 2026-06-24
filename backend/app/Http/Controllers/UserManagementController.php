<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Services\SnipeItService;
use App\Services\TicketService;

class UserManagementController extends Controller
{
    private const DEPARTMENT_HCGA_ID = 1;
    private const DEPARTMENT_IT_ID = 8;
    private const HCGA_ALLOWED_LEVEL_1_POSITION = 'Admin Human Capital';

    // ─────────────────────────────────────────────
    // HELPER: ambil departments user dari pivot
    // ─────────────────────────────────────────────
    private function getUserDepartments(string $userId): array
    {
        return DB::connection('pilargroup')
            ->table('central_user_departments as cud')
            ->join('master_departments as md', 'cud.department_id', '=', 'md.id')
            ->where('cud.user_id', $userId)
            ->select('md.id', 'md.name', 'md.class', 'md.code', 'cud.is_primary')
            ->get()
            ->toArray();
    }

    // ─────────────────────────────────────────────
    // HELPER: ambil companies user dari pivot
    // ─────────────────────────────────────────────
    private function getUserCompanies(string $userId): array
    {
        return DB::connection('pilargroup')
            ->table('central_user_companies as cuc')
            ->join('master_companies as mc', 'cuc.company_id', '=', 'mc.id')
            ->where('cuc.user_id', $userId)
            ->select('mc.id', 'mc.code', 'mc.name', 'cuc.is_primary')
            ->get()
            ->toArray();
    }

    // ─────────────────────────────────────────────
    // HELPER: ambil primary department name
    // ─────────────────────────────────────────────
    private function getPrimaryDepartmentName(string $userId): ?string
    {
        $dept = DB::connection('pilargroup')
            ->table('central_user_departments as cud')
            ->join('master_departments as md', 'cud.department_id', '=', 'md.id')
            ->where('cud.user_id', $userId)
            ->orderByRaw('cud.is_primary DESC')
            ->value('md.name');

        return $dept ?? null;
    }

    // ─────────────────────────────────────────────
    // HELPER: sync pivot departments + companies
    // ─────────────────────────────────────────────
    private function syncUserDepartments(string $userId, array $departments, ?array $companies, string $now): void
    {
        DB::connection('pilargroup')
            ->table('central_user_departments')
            ->where('user_id', $userId)
            ->delete();

        $hasPrimary = collect($departments)->contains(fn ($d) => !empty($d['is_primary']));

        foreach ($departments as $i => $dept) {
            $isPrimary = !empty($dept['is_primary']) ? 1 : (!$hasPrimary && $i === 0 ? 1 : 0);

            DB::connection('pilargroup')->table('central_user_departments')->insert([
                'id'            => Str::uuid()->toString(),
                'user_id'       => $userId,
                'department_id' => $dept['id'],
                'is_primary'    => $isPrimary,
                'created_at'    => $now,
                'updated_at'    => $now,
            ]);
        }

        $shouldAutoDerive = is_null($companies) || (is_array($companies) && count($companies) === 0);

        DB::connection('pilargroup')
            ->table('central_user_companies')
            ->where('user_id', $userId)
            ->delete();

        if (!$shouldAutoDerive) {
            $uniqueCompanies = collect($companies)->unique('id')->values()->all();

            foreach ($uniqueCompanies as $i => $company) {
                $isPrimary = !empty($company['is_primary']) ? 1 : ($i === 0 ? 1 : 0);

                DB::connection('pilargroup')->table('central_user_companies')->insert([
                    'id'         => Str::uuid()->toString(),
                    'user_id'    => $userId,
                    'company_id' => $company['id'],
                    'is_primary' => $isPrimary,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            return;
        }

        $companyIds = DB::connection('pilargroup')
            ->table('master_departments')
            ->whereIn('id', collect($departments)->pluck('id')->toArray())
            ->whereNotNull('company_id')
            ->distinct()
            ->pluck('company_id');

        foreach ($companyIds as $i => $companyId) {
            DB::connection('pilargroup')->table('central_user_companies')->insert([
                'id'         => Str::uuid()->toString(),
                'user_id'    => $userId,
                'company_id' => $companyId,
                'is_primary' => $i === 0 ? 1 : 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    // ─────────────────────────────────────────────
    // HELPER: requester role for user management
    // ─────────────────────────────────────────────
    private function isRequesterIT(Request $request): bool
    {
        if ($request->has('auth_is_it')) {
            return (bool) $request->input('auth_is_it');
        }

        return DB::connection('pilargroup')
            ->table('central_user_departments')
            ->where('user_id', $request->user_id)
            ->where('department_id', self::DEPARTMENT_IT_ID)
            ->exists();
    }

    private function isRequesterHCGA(Request $request): bool
    {
        if ($request->has('auth_is_hcga')) {
            return (bool) $request->input('auth_is_hcga');
        }

        return DB::connection('pilargroup')
            ->table('central_user_departments')
            ->where('user_id', $request->user_id)
            ->where('department_id', self::DEPARTMENT_HCGA_ID)
            ->exists();
    }

    private function isRequesterLimitedHCGA(Request $request): bool
    {
        return $this->isRequesterHCGA($request) && !$this->isRequesterIT($request);
    }

    private function rejectAppsManagementForHCGA(Request $request)
    {
        if ($this->isRequesterLimitedHCGA($request) && $request->has('apps')) {
            return response()->json([
                'message' => 'HCGA users are not allowed to manage application access.',
            ], 403);
        }

        return null;
    }

    private function canHCGAManageByJobRule($jobLevelId, ?string $jobPosition): bool
    {
        if (!$jobLevelId) {
            return false;
        }

        $level = DB::connection('pilargroup')
            ->table('master_job_levels')
            ->where('id', $jobLevelId)
            ->value('level');

        if (is_null($level)) {
            return false;
        }

        $level = (int) $level;
        $jobPosition = trim((string) $jobPosition);

        return $level >= 1;
    }

    private function canHCGAManageExistingUser($user): bool
    {
        return $this->canHCGAManageByJobRule(
            $user->job_level_id ?? null,
            $user->job_position ?? null
        );
    }

    private function getHCGADeniedMessage(): string
    {
        return 'HCGA users can only manage users with job level 1 or above.';
    }

    // ─────────────────────────────────────────────
    // GET /api/users
    // ─────────────────────────────────────────────
    public function index()
    {
        $users = DB::connection('pilargroup')
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
                'cu.employment_type_code',
                'mjl.name as job_level',
                'mjl.level as job_level_value',
                'cu.is_active',
                'cu.created_at',
                'cu.updated_at'
            )
            ->orderBy('cu.name')
            ->get()
            ->map(function ($user) {
                $user->departments = $this->getUserDepartments($user->id);
                $user->companies   = $this->getUserCompanies($user->id);
                $user->apps        = DB::connection('pilargroup')
                    ->table('central_user_projects as cup')
                    ->join('master_projects as mp', 'cup.project_id', '=', 'mp.id')
                    ->where('cup.user_id', $user->id)
                    ->pluck('mp.slug')
                    ->toArray();

                return $user;
            });

        return response()->json($users);
    }

    // ─────────────────────────────────────────────
    // GET /api/users/{id}
    // ─────────────────────────────────────────────
    public function show($id)
    {
        $user = DB::connection('pilargroup')
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
                'cu.employment_type_code',
                'mjl.name as job_level',
                'mjl.level as job_level_value',
                'cu.is_active',
                'cu.created_at',
                'cu.updated_at'
            )
            ->where('cu.id', $id)
            ->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $user->departments = $this->getUserDepartments($user->id);
        $user->companies   = $this->getUserCompanies($user->id);
        $user->apps        = DB::connection('pilargroup')
            ->table('central_user_projects as cup')
            ->join('master_projects as mp', 'cup.project_id', '=', 'mp.id')
            ->where('cup.user_id', $id)
            ->pluck('mp.slug')
            ->toArray();

        return response()->json($user);
    }

    // ─────────────────────────────────────────────
    // POST /api/users
    // ─────────────────────────────────────────────
    public function store(Request $request)
    {
        $appsDeniedResponse = $this->rejectAppsManagementForHCGA($request);
        if ($appsDeniedResponse) {
            return $appsDeniedResponse;
        }

        $isIT = $this->isRequesterIT($request);
        $isLimitedHCGA = $this->isRequesterLimitedHCGA($request);

        $request->validate([
            'username'                 => 'required|string|min:3',
            'password'                 => 'required|string|min:6',
            'name'                     => 'required|string',
            'email'                    => 'nullable|email',
            'phone'                    => 'nullable|string|max:20',
            'job_position'             => 'nullable|string',
            'job_level_id'             => 'nullable|integer|exists:pilargroup.master_job_levels,id',
            'employment_type_code'     => 'nullable|string|in:UP,OS,HL',
            'internal_id'              => 'nullable|integer',
            'departments'              => 'required|array|min:1',
            'departments.*.id'         => 'required|integer|exists:pilargroup.master_departments,id',
            'departments.*.is_primary' => 'nullable|boolean',
            'companies'                => 'nullable|array',
            'companies.*.id'           => 'required_with:companies|string|exists:pilargroup.master_companies,id',
            'companies.*.is_primary'   => 'nullable|boolean',
            'apps'                     => $isIT ? 'required|array' : 'nullable|array',
            'apps.*'                   => 'string|exists:pilargroup.master_projects,slug',
        ]);

        if ($isLimitedHCGA && !$this->canHCGAManageByJobRule(
            $request->input('job_level_id'),
            $request->input('job_position')
        )) {
            return response()->json([
                'message' => $this->getHCGADeniedMessage(),
            ], 403);
        }

        try {
            $usernameExists = DB::connection('pilargroup')
                ->table('central_users')
                ->where('username', $request->input('username'))
                ->exists();

            if ($usernameExists) {
                return response()->json(['message' => 'Username sudah digunakan'], 422);
            }

            if ($request->filled('internal_id')) {
                $internalIdExists = DB::connection('pilargroup')
                    ->table('central_users')
                    ->where('internal_id', $request->input('internal_id'))
                    ->exists();

                if ($internalIdExists) {
                    return response()->json(['message' => 'Internal ID sudah digunakan'], 422);
                }
            }

            $userId = Str::uuid()->toString();
            $now = now()->toDateTimeString();

            DB::connection('pilargroup')->transaction(function () use ($request, $userId, $now, $isIT) {
                DB::connection('pilargroup')->table('central_users')->insert([
                    'id'                   => $userId,
                    'internal_id'          => $request->input('internal_id'),
                    'username'             => $request->input('username'),
                    'password'             => Hash::make($request->input('password')),
                    'name'                 => $request->input('name'),
                    'email'                => $request->input('email'),
                    'phone'                => $request->input('phone'),
                    'job_position'         => $request->input('job_position'),
                    'job_level_id'         => $request->input('job_level_id'),
                    'employment_type_code' => $request->input('employment_type_code'),
                    'is_active'            => 1,
                    'created_at'           => $now,
                    'updated_at'           => $now,
                ]);

                $this->syncUserDepartments(
                    $userId,
                    $request->input('departments'),
                    $request->input('companies'),
                    $now
                );

                if ($isIT) {
                    $projectIds = DB::connection('pilargroup')
                        ->table('master_projects')
                        ->whereIn('slug', $request->input('apps', []))
                        ->pluck('id');

                    foreach ($projectIds as $projectId) {
                        DB::connection('pilargroup')->table('central_user_projects')->insert([
                            'id'         => Str::uuid()->toString(),
                            'user_id'    => $userId,
                            'project_id' => $projectId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    }
                }
            });

            $deptName = $this->getPrimaryDepartmentName($userId);

            $jobLevelName = null;
            if ($request->filled('job_level_id')) {
                $jobLevelName = DB::connection('pilargroup')
                    ->table('master_job_levels')
                    ->where('id', $request->input('job_level_id'))
                    ->value('name');
            }

            $newUser = (object) [
                'id'                   => $userId,
                'username'             => $request->input('username'),
                'name'                 => $request->input('name'),
                'email'                => $request->input('email'),
                'phone'                => $request->input('phone'),
                'job_position'         => $request->input('job_position'),
                'employment_type_code' => $request->input('employment_type_code'),
            ];

            (new SnipeItService())->syncUser($newUser, $deptName, $jobLevelName);

            if ($isIT && in_array('ticket', $request->input('apps', []))) {
                (new TicketService())->syncUser($newUser, $deptName);
            }

            return response()->json([
                'message' => 'User berhasil dibuat',
                'user_id' => $userId,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error saat membuat user',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    // ─────────────────────────────────────────────
    // PUT /api/users/{id}
    // ─────────────────────────────────────────────
    public function update(Request $request, $id)
    {
        foreach ([
            'username',
            'password',
            'name',
            'email',
            'phone',
            'job_position',
            'job_level_id',
            'employment_type_code',
            'internal_id',
        ] as $field) {
            if ($request->has($field) && $request->input($field) === '') {
                $request->merge([$field => null]);
            }
        }

        $appsDeniedResponse = $this->rejectAppsManagementForHCGA($request);
        if ($appsDeniedResponse) {
            return $appsDeniedResponse;
        }

        $request->validate([
            'username'                 => 'nullable|string|min:3',
            'password'                 => 'nullable|string|min:6',
            'name'                     => 'nullable|string',
            'email'                    => 'nullable|email',
            'phone'                    => 'nullable|string|max:20',
            'job_position'             => 'nullable|string',
            'job_level_id'             => 'nullable|integer|exists:pilargroup.master_job_levels,id',
            'employment_type_code'     => 'nullable|string|in:UP,OS,HL',
            'internal_id'              => 'nullable|integer',
            'is_active'                => 'nullable|boolean',
            'departments'              => 'nullable|array|min:1',
            'departments.*.id'         => 'required_with:departments|integer|exists:pilargroup.master_departments,id',
            'departments.*.is_primary' => 'nullable|boolean',
            'companies'                => 'nullable|array',
            'companies.*.id'           => 'required_with:companies|string|exists:pilargroup.master_companies,id',
            'companies.*.is_primary'   => 'nullable|boolean',
            'apps'                     => 'nullable|array',
            'apps.*'                   => 'string|exists:pilargroup.master_projects,slug',
        ]);

        $user = DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $id)
            ->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($this->isRequesterLimitedHCGA($request)) {
            if (!$this->canHCGAManageExistingUser($user)) {
                return response()->json([
                    'message' => 'HCGA users are not allowed to update this user.',
                ], 403);
            }

            $finalJobLevelId = $request->has('job_level_id')
                ? $request->input('job_level_id')
                : $user->job_level_id;

            $finalJobPosition = $request->has('job_position')
                ? $request->input('job_position')
                : $user->job_position;

            if (!$this->canHCGAManageByJobRule($finalJobLevelId, $finalJobPosition)) {
                return response()->json([
                    'message' => $this->getHCGADeniedMessage(),
                ], 403);
            }
        }

        $oldUsername = $user->username;
        $now = now()->toDateTimeString();
        $updates = ['updated_at' => $now];

        if ($request->filled('username')) {
            $exists = DB::connection('pilargroup')
                ->table('central_users')
                ->where('username', $request->input('username'))
                ->where('id', '!=', $id)
                ->exists();

            if ($exists) {
                return response()->json(['message' => 'Username sudah digunakan'], 422);
            }

            $updates['username'] = $request->input('username');
        }

        if ($request->filled('password')) {
            $updates['password'] = Hash::make($request->input('password'));
        }

        if ($request->filled('name')) {
            $updates['name'] = $request->input('name');
        }

        if ($request->has('email')) {
            $updates['email'] = $request->input('email');
        }

        if ($request->has('phone')) {
            $updates['phone'] = $request->input('phone');
        }

        if ($request->has('job_position')) {
            $updates['job_position'] = $request->input('job_position');
        }

        if ($request->has('job_level_id')) {
            $updates['job_level_id'] = $request->input('job_level_id');
        }

        if ($request->has('employment_type_code')) {
            $updates['employment_type_code'] = $request->input('employment_type_code');
        }

        if ($request->has('is_active')) {
            $updates['is_active'] = (int) $request->input('is_active');
        }

        if ($request->has('internal_id')) {
            $internalId = $request->input('internal_id');

            if (!is_null($internalId)) {
                $exists = DB::connection('pilargroup')
                    ->table('central_users')
                    ->where('internal_id', $internalId)
                    ->where('id', '!=', $id)
                    ->exists();

                if ($exists) {
                    return response()->json(['message' => 'Internal ID sudah digunakan'], 422);
                }
            }

            $updates['internal_id'] = $internalId;
        }

        $isIT = $this->isRequesterIT($request);

        DB::connection('pilargroup')->transaction(function () use ($id, $updates, $now, $request, $isIT) {
            DB::connection('pilargroup')
                ->table('central_users')
                ->where('id', $id)
                ->update($updates);

            if ($request->has('departments') || $request->has('companies')) {
                $departments = $request->input('departments');

                if (!$request->has('departments')) {
                    $departments = DB::connection('pilargroup')
                        ->table('central_user_departments')
                        ->where('user_id', $id)
                        ->select('department_id as id', 'is_primary')
                        ->get()
                        ->map(fn ($d) => ['id' => $d->id, 'is_primary' => $d->is_primary])
                        ->toArray();
                }

                $companies = $request->has('companies') ? $request->input('companies') : null;

                $this->syncUserDepartments($id, $departments, $companies, $now);
            }

            if ($isIT && $request->has('apps')) {
                $selectedApps = array_values(array_filter(
                    (array) $request->input('apps'),
                    fn ($app) => is_string($app) && trim($app) !== ''
                ));

                $projectIds = DB::connection('pilargroup')
                    ->table('master_projects')
                    ->whereIn('slug', $selectedApps)
                    ->pluck('id')
                    ->toArray();

                DB::connection('pilargroup')
                    ->table('central_user_projects')
                    ->where('user_id', $id)
                    ->delete();

                foreach ($projectIds as $projectId) {
                    DB::connection('pilargroup')->table('central_user_projects')->insert([
                        'id'         => Str::uuid()->toString(),
                        'user_id'    => $id,
                        'project_id' => $projectId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }
        });

        $updatedUser = DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $id)
            ->first();

        $credentialChanged = isset($updates['username']) || isset($updates['password']);

        if ($credentialChanged) {
            DB::connection('pilargroup')
                ->table('central_users')
                ->where('id', $id)
                ->increment('token_version');

            (new SnipeItService())->forceRelogin($updatedUser->username);
            (new TicketService())->forceLogout($id);
        }

        $snipeRelevant = isset($updates['username'])
            || isset($updates['name'])
            || isset($updates['email'])
            || isset($updates['job_position'])
            || isset($updates['employment_type_code'])
            || $request->has('departments')
            || $request->has('job_level_id');

        if ($snipeRelevant) {
            $snipeDept = $this->getPrimaryDepartmentName($id);

            $snipeJobLevel = null;
            if ($updatedUser->job_level_id) {
                $snipeJobLevel = DB::connection('pilargroup')
                    ->table('master_job_levels')
                    ->where('id', $updatedUser->job_level_id)
                    ->value('name');
            }

            (new SnipeItService())->syncUser($updatedUser, $snipeDept, $snipeJobLevel, $oldUsername);
        }

        $finalApps = DB::connection('pilargroup')
            ->table('central_user_projects as cup')
            ->join('master_projects as mp', 'cup.project_id', '=', 'mp.id')
            ->where('cup.user_id', $id)
            ->pluck('mp.slug')
            ->toArray();

        if (in_array('ticket', $finalApps)) {
            $ticketDept = $this->getPrimaryDepartmentName($id);
            (new TicketService())->syncUser($updatedUser, $ticketDept, $oldUsername);
        }

        return response()->json(['message' => 'User berhasil diupdate']);
    }

    // ─────────────────────────────────────────────
    // PATCH /api/users/{id}/status
    // ─────────────────────────────────────────────
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'is_active' => 'required|boolean',
        ]);

        $user = DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $id)
            ->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($this->isRequesterLimitedHCGA($request) && !$this->canHCGAManageExistingUser($user)) {
            return response()->json([
                'message' => 'HCGA users are not allowed to update this user.',
            ], 403);
        }

        $isActive = (int) $request->boolean('is_active');

        DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $id)
            ->update([
                'is_active'  => $isActive,
                'updated_at' => now()->toDateTimeString(),
            ]);

        return response()->json([
            'message' => $isActive
                ? 'User berhasil diaktifkan'
                : 'User berhasil dinonaktifkan',
            'data' => [
                'id'        => $id,
                'is_active' => $isActive,
            ],
        ]);
    }

    // ─────────────────────────────────────────────
    // DELETE /api/users/{id}
    // ─────────────────────────────────────────────
    public function destroy($id)
    {
        $user = DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $id)
            ->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $username = $user->username;

        $userApps = DB::connection('pilargroup')
            ->table('central_user_projects as cup')
            ->join('master_projects as mp', 'cup.project_id', '=', 'mp.id')
            ->where('cup.user_id', $id)
            ->pluck('mp.slug')
            ->toArray();

        try {
            DB::connection('pilargroup')->transaction(function () use ($id) {
                DB::connection('pilargroup')->table('central_user_departments')->where('user_id', $id)->delete();
                DB::connection('pilargroup')->table('central_user_companies')->where('user_id', $id)->delete();
                DB::connection('pilargroup')->table('central_user_projects')->where('user_id', $id)->delete();
                DB::connection('pilargroup')->table('central_users')->where('id', $id)->delete();
            });

            if (in_array('ticket', $userApps)) {
                (new TicketService())->deleteUser($username);
            }

            (new SnipeItService())->deleteUser($username);

            return response()->json(['message' => 'User berhasil dihapus']);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error saat menghapus user',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
