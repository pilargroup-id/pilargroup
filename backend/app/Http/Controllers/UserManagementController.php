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
    // HELPER: ambil primary department name (untuk sync SnipeIt/Ticket)
    // ─────────────────────────────────────────────
    private function getPrimaryDepartmentName(string $userId): ?string
    {
        // Coba ambil yang is_primary = 1 dulu, fallback ke yang pertama
        $dept = DB::connection('pilargroup')
            ->table('central_user_departments as cud')
            ->join('master_departments as md', 'cud.department_id', '=', 'md.id')
            ->where('cud.user_id', $userId)
            ->orderByRaw('cud.is_primary DESC')
            ->value('md.name');

        return $dept ?? null;
    }

    // ─────────────────────────────────────────────
    // HELPER: sync pivot departments + auto-derive companies
    // Dipakai di store & update supaya DRY
    // ─────────────────────────────────────────────
    private function syncUserDepartments(string $userId, array $departments, string $now): void
    {
        // Hapus pivot lama
        DB::connection('pilargroup')
            ->table('central_user_departments')
            ->where('user_id', $userId)
            ->delete();

        DB::connection('pilargroup')
            ->table('central_user_companies')
            ->where('user_id', $userId)
            ->delete();

        // Pastikan ada tepat 1 primary
        // Kalau user kirim is_primary, pakai itu. Kalau tidak ada yang primary, index 0 jadi primary.
        $hasPrimary = collect($departments)->contains(fn($d) => !empty($d['is_primary']));

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

        // Auto-derive companies dari departments yang dipilih (unique)
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
                'cu.id', 'cu.internal_id', 'cu.username', 'cu.name',
                'cu.email', 'cu.phone', 'cu.job_position',
                'cu.job_level_id', 'mjl.name as job_level', 'mjl.level as job_level_value',
                'cu.is_active', 'cu.created_at', 'cu.updated_at'
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
        $request->validate([
            'username'             => 'required|string|min:3',
            'password'             => 'required|string|min:6',
            'name'                 => 'required|string',
            'email'                => 'nullable|email',
            'phone'                => 'nullable|string|max:20',
            'job_position'         => 'nullable|string',
            'job_level_id'         => 'nullable|integer|exists:pilargroup.master_job_levels,id',
            'internal_id'          => 'nullable|integer',
            'departments'          => 'required|array|min:1',
            'departments.*.id'     => 'required|integer|exists:pilargroup.master_departments,id',
            'departments.*.is_primary' => 'nullable|boolean',
            'apps'                 => 'required|array',
            'apps.*'               => 'string|exists:pilargroup.master_projects,slug',
        ]);

        try {
            // Cek username unik
            $usernameExists = DB::connection('pilargroup')
                ->table('central_users')
                ->where('username', $request->input('username'))
                ->exists();

            if ($usernameExists) {
                return response()->json(['message' => 'Username sudah digunakan'], 422);
            }

            // Cek internal_id unik kalau diisi
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
            $now    = now()->toDateTimeString();

            DB::connection('pilargroup')->transaction(function () use ($request, $userId, $now) {
                // 1. Insert user (tanpa department_id — sudah di pivot)
                DB::connection('pilargroup')->table('central_users')->insert([
                    'id'           => $userId,
                    'internal_id'  => $request->input('internal_id'),
                    'username'     => $request->input('username'),
                    'password'     => Hash::make($request->input('password')),
                    'name'         => $request->input('name'),
                    'email'        => $request->input('email'),
                    'phone'        => $request->input('phone'),
                    'job_position' => $request->input('job_position'),
                    'job_level_id' => $request->input('job_level_id'),
                    'is_active'    => 1,
                    'created_at'   => $now,
                    'updated_at'   => $now,
                ]);

                // 2. Sync pivot departments + auto-derive companies
                $this->syncUserDepartments($userId, $request->input('departments'), $now);

                // 3. Insert project access
                $projectIds = DB::connection('pilargroup')
                    ->table('master_projects')
                    ->whereIn('slug', $request->input('apps'))
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
            });

            // Sync ke sub-projects (di luar transaction, boleh gagal tanpa rollback user)
            $deptName = $this->getPrimaryDepartmentName($userId);

            $jobLevelName = null;
            if ($request->filled('job_level_id')) {
                $jobLevelName = DB::connection('pilargroup')
                    ->table('master_job_levels')
                    ->where('id', $request->input('job_level_id'))
                    ->value('name');
            }

            $newUser = (object) [
                'id'           => $userId,
                'username'     => $request->input('username'),
                'name'         => $request->input('name'),
                'email'        => $request->input('email'),
                'phone'        => $request->input('phone'),
                'job_position' => $request->input('job_position'),
            ];

            // SnipeIt — selalu sync
            (new SnipeItService())->syncUser($newUser, $deptName, $jobLevelName);

            // Ticket — hanya kalau user punya akses ticket
            if (in_array('ticket', $request->input('apps', []))) {
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
        // Normalize empty string ke null untuk nullable fields
        foreach (['username', 'password', 'name', 'email', 'phone', 'job_position', 'job_level_id', 'internal_id'] as $field) {
            if ($request->has($field) && $request->input($field) === '') {
                $request->merge([$field => null]);
            }
        }

        $request->validate([
            'username'             => 'nullable|string|min:3',
            'password'             => 'nullable|string|min:6',
            'name'                 => 'nullable|string',
            'email'                => 'nullable|email',
            'phone'                => 'nullable|string|max:20',
            'job_position'         => 'nullable|string',
            'job_level_id'         => 'nullable|integer|exists:pilargroup.master_job_levels,id',
            'internal_id'          => 'nullable|integer',
            'is_active'            => 'nullable|boolean',
            'departments'          => 'nullable|array|min:1',
            'departments.*.id'     => 'required_with:departments|integer|exists:pilargroup.master_departments,id',
            'departments.*.is_primary' => 'nullable|boolean',
            'apps'                 => 'nullable|array',
            'apps.*'               => 'string|exists:pilargroup.master_projects,slug',
        ]);

        $user = DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $id)
            ->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $oldUsername = $user->username;
        $now         = now()->toDateTimeString();
        $updates     = ['updated_at' => $now];

        // ── field-field central_users ──
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

        if ($request->filled('name'))         $updates['name']         = $request->input('name');
        if ($request->has('email'))           $updates['email']         = $request->input('email');   // bisa null
        if ($request->has('phone'))           $updates['phone']         = $request->input('phone');   // bisa null
        if ($request->has('job_position'))    $updates['job_position']  = $request->input('job_position');
        if ($request->has('job_level_id'))    $updates['job_level_id']  = $request->input('job_level_id');
        if ($request->has('is_active'))       $updates['is_active']     = (int) $request->input('is_active');

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

        DB::connection('pilargroup')->transaction(function () use ($id, $updates, $now, $request) {
            // Update central_users
            DB::connection('pilargroup')->table('central_users')->where('id', $id)->update($updates);

            // Update pivot departments (kalau dikirim)
            if ($request->has('departments') && is_array($request->input('departments'))) {
                $this->syncUserDepartments($id, $request->input('departments'), $now);
            }

            // Update project access (kalau dikirim)
            if ($request->has('apps')) {
                $selectedApps = array_values(array_filter(
                    (array) $request->input('apps'),
                    fn($app) => is_string($app) && trim($app) !== ''
                ));

                $projectIds = DB::connection('pilargroup')
                    ->table('master_projects')
                    ->whereIn('slug', $selectedApps)
                    ->pluck('id')
                    ->toArray();

                DB::connection('pilargroup')->table('central_user_projects')->where('user_id', $id)->delete();

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

        // Ambil data terbaru setelah update
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

        // Sync ke SnipeIt kalau ada perubahan relevan
        $snipeRelevant = isset($updates['username']) || isset($updates['name'])
            || isset($updates['email']) || $request->has('departments') || $request->has('job_level_id');

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

        // Sync ke Ticket kalau user punya akses
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

        // Ambil apps sebelum delete (untuk tau perlu sync ke mana)
        $userApps = DB::connection('pilargroup')
            ->table('central_user_projects as cup')
            ->join('master_projects as mp', 'cup.project_id', '=', 'mp.id')
            ->where('cup.user_id', $id)
            ->pluck('mp.slug')
            ->toArray();

        try {
            DB::connection('pilargroup')->transaction(function () use ($id) {
                // Pivot tables terhapus otomatis via ON DELETE CASCADE di DDL
                // tapi kita explicit delete untuk safety
                DB::connection('pilargroup')->table('central_user_departments')->where('user_id', $id)->delete();
                DB::connection('pilargroup')->table('central_user_companies')->where('user_id', $id)->delete();
                DB::connection('pilargroup')->table('central_user_projects')->where('user_id', $id)->delete();
                DB::connection('pilargroup')->table('central_users')->where('id', $id)->delete();
            });

            // Sync delete ke sub-projects
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