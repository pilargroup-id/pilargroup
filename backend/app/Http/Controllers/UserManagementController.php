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
    // GET /api/users → list semua user
    public function index()
    {
        $users = DB::connection('pilargroup')
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
                'cu.is_active',
                'cu.created_at',
                'cu.updated_at'
            )
            ->orderBy('cu.name')
            ->get()
            ->map(function ($user) {
                $user->apps = DB::connection('pilargroup')
                    ->table('central_user_projects as cup')
                    ->join('master_projects as mp', 'cup.project_id', '=', 'mp.id')
                    ->where('cup.user_id', $user->id)
                    ->pluck('mp.slug')
                    ->toArray();
                return $user;
            });

        return response()->json($users);
    }

    // POST /api/users → register user baru
    public function store(Request $request)
    {
        // Validation akan throw ValidationException otomatis jika gagal (422)
        $request->validate([
            'username'      => 'required|string|min:3',
            'password'      => 'required|string|min:6',
            'name'          => 'required|string',
            'email'         => 'nullable|email',
            'phone'         => 'nullable|string|max:20',
            'department_id' => 'required|integer|exists:pilargroup.master_departments,id',
            'job_position'  => 'nullable|string',
            'job_level_id'  => 'nullable|integer|exists:pilargroup.master_job_levels,id',
            'internal_id'   => 'nullable|integer',
            'apps'          => 'required|array',
            'apps.*'        => 'string|exists:pilargroup.master_projects,slug',
        ]);

        try {
            // Manual check username
            $usernameExists = DB::connection('pilargroup')
                ->table('central_users')
                ->where('username', $request->input('username'))
                ->exists();

            if ($usernameExists) {
                return response()->json(['message' => 'The username has already been taken.'], 422);
            }

            // Manual check internal_id jika ada
            if ($request->input('internal_id')) {
                $internalIdExists = DB::connection('pilargroup')
                    ->table('central_users')
                    ->where('internal_id', $request->input('internal_id'))
                    ->exists();

                if ($internalIdExists) {
                    return response()->json(['message' => 'The internal id has already been taken.'], 422);
                }
            }

            $userId = Str::uuid()->toString();
            $now = now()->toDateTimeString();

            DB::connection('pilargroup')
                ->table('central_users')
                ->insert([
                    'id'            => $userId,
                    'internal_id'   => $request->input('internal_id'),
                    'username'      => $request->input('username'),
                    'password'      => Hash::make($request->input('password')),
                    'name'          => $request->input('name'),
                    'email'         => $request->input('email'),
                    'phone'         => $request->input('phone'),
                    'department_id' => $request->input('department_id'),
                    'job_position'  => $request->input('job_position'),
                    'job_level_id'  => $request->input('job_level_id'),
                    'is_active'     => 1,
                    'created_at'    => $now,
                    'updated_at'    => $now,
                ]);

            $projectIds = DB::connection('pilargroup')
                ->table('master_projects')
                ->whereIn('slug', $request->input('apps'))
                ->pluck('id');

            foreach ($projectIds as $projectId) {
                DB::connection('pilargroup')
                    ->table('central_user_projects')
                    ->insert([
                        'id'         => Str::uuid()->toString(),
                        'user_id'    => $userId,
                        'project_id' => $projectId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
            }

            $jobLevelName = null;
            if ($request->input('job_level_id')) {
                $jobLevelName = DB::connection('pilargroup')
                    ->table('master_job_levels')
                    ->where('id', $request->input('job_level_id'))
                    ->value('name');
            }

            $newUser = (object) [
                'username'     => $request->input('username'),
                'name'         => $request->input('name'),
                'email'        => $request->input('email'),
                'phone'        => $request->input('phone'),
                'job_position' => $request->input('job_position'),
                'job_level'    => $jobLevelName,
            ];

            // Ambil nama department untuk sync
            $department = null;
            if ($request->input('department_id')) {
                $dept = DB::connection('pilargroup')
                    ->table('master_departments')
                    ->where('id', $request->input('department_id'))
                    ->value('name');
                $department = $dept ?? null;
            }

            // Sync ke SnipeIt (sudah ada)
            $jobLevelName = null;
            if ($request->input('job_level_id')) {
                $jobLevelName = \DB::connection('pilargroup')
                    ->table('master_job_levels')
                    ->where('id', $request->input('job_level_id'))
                    ->value('name');
            }

            (new SnipeItService())->syncUser($newUser, $department, $jobLevelName);

            // Sync ke ticket hanya kalau user punya akses ticket
            if (in_array('ticket', $request->input('apps', []))) {
                (new \App\Services\TicketService())->syncUser($newUser, $department);
            }

            return response()->json([
                'message' => 'User registered successfully',
                'user_id' => $userId,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error creating user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // PUT /api/users/{id} → update user
    public function update(Request $request, $id)
    {
        // Normalize empty strings to null for nullable fields
        $nullableFields = ['username', 'password', 'name', 'email', 'phone', 'job_position', 'job_level_id'];
        foreach ($nullableFields as $field) {
            if ($request->has($field) && $request->input($field) === '') {
                $request->merge([$field => null]);
            }
        }

        $request->validate([
            'username'      => 'nullable|string|min:3',
            'password'      => 'nullable|string|min:6',
            'name'          => 'nullable|string',
            'email'         => 'nullable|email',
            'phone'         => 'nullable|string|max:20',
            'department_id' => 'nullable|integer|exists:pilargroup.master_departments,id',
            'job_position'  => 'nullable|string',
            'job_level_id' => 'nullable|integer|exists:pilargroup.master_job_levels,id',
            'internal_id'   => 'nullable|integer',
            'is_active'     => 'nullable|boolean',
            'apps'          => 'nullable|array',
            'apps.*'        => 'string|exists:pilargroup.master_projects,slug',
        ]);

        $user = DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $id)
            ->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $oldUsername = $user->username;

        $now = now()->toDateTimeString();
        $updates = ['updated_at' => $now];

        if ($request->has('username') && !is_null($request->input('username'))) {
            $exists = DB::connection('pilargroup')
                ->table('central_users')
                ->where('username', $request->input('username'))
                ->where('id', '!=', $id)
                ->exists();

            if ($exists) {
                return response()->json(['message' => 'Username already exists'], 422);
            }
            $updates['username'] = $request->input('username');
        }

        if ($request->has('password') && !is_null($request->input('password'))) {
            $updates['password'] = Hash::make($request->input('password'));
        }

        if ($request->has('name') && !is_null($request->input('name'))) {
            $updates['name'] = $request->input('name');
        }

        if ($request->has('email'))        $updates['email']        = $request->input('email'); // bisa null
        if ($request->has('phone'))        $updates['phone']        = $request->input('phone'); // bisa null
        if ($request->has('job_position')) $updates['job_position'] = $request->input('job_position'); // bisa null
        if ($request->has('job_level_id')) $updates['job_level_id'] = $request->input('job_level_id'); // bisa null

        if ($request->has('department_id') && !is_null($request->input('department_id'))) {
            $updates['department_id'] = $request->input('department_id');
        }

        if (!is_null($request->input('is_active'))) {
            $updates['is_active'] = $request->input('is_active');
        }

        if (array_key_exists('internal_id', $request->all())) {
            $internalId = $request->input('internal_id');

            if (!is_null($internalId)) {
                $internalIdExists = DB::connection('pilargroup')
                    ->table('central_users')
                    ->where('internal_id', $internalId)
                    ->where('id', '!=', $id)
                    ->exists();

                if ($internalIdExists) {
                    return response()->json(['message' => 'Internal ID already exists'], 422);
                }
            }

            $updates['internal_id'] = $internalId;
        }

        DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $id)
            ->update($updates);

        // Ambil data user terbaru setelah update
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

        // Sync ke SnipeIt (sudah ada, kondisinya kita relax jadi selalu sync kalau ada perubahan)
        if (isset($updates['username']) || isset($updates['name']) || isset($updates['email'])) {
            $snipeDept = null;
            if ($updatedUser->department_id) {
                $snipeDept = DB::connection('pilargroup')
                    ->table('master_departments')
                    ->where('id', $updatedUser->department_id)
                    ->value('name');
            }

            $snipeJobLevel = null;
            if ($updatedUser->job_level_id) {
                $snipeJobLevel = DB::connection('pilargroup')
                    ->table('master_job_levels')
                    ->where('id', $updatedUser->job_level_id)
                    ->value('name');
            }

            (new SnipeItService())->syncUser($updatedUser, $snipeDept, $snipeJobLevel, $oldUsername);
        }

        // Cek apakah user punya akses ticket (dari apps yang dikirim, atau dari DB kalau apps tidak dikirim)
        $userApps = $request->has('apps')
            ? $request->input('apps', [])
            : DB::connection('pilargroup')
                ->table('central_user_projects as cup')
                ->join('master_projects as mp', 'cup.project_id', '=', 'mp.id')
                ->where('cup.user_id', $id)
                ->pluck('mp.slug')
                ->toArray();

        \Log::info('DEBUG SYNC', [
            'userApps'    => $userApps,
            'hasTicket'   => in_array('ticket', $userApps),
            'requestApps' => $request->input('apps'),
        ]);

        // Update apps dulu ke DB
        if ($request->has('apps')) {
            $selectedApps = array_values(array_filter((array) $request->input('apps'), function ($app) {
                return is_string($app) && trim($app) !== '';
            }));

            $projectIds = DB::connection('pilargroup')
                ->table('master_projects')
                ->whereIn('slug', $selectedApps)
                ->pluck('id')
                ->toArray();

            DB::connection('pilargroup')->transaction(function () use ($id, $now, $projectIds) {
                DB::connection('pilargroup')
                    ->table('central_user_projects')
                    ->where('user_id', $id)
                    ->delete();

                foreach ($projectIds as $projectId) {
                    DB::connection('pilargroup')
                        ->table('central_user_projects')
                        ->insert([
                            'id'         => Str::uuid()->toString(),
                            'user_id'    => $id,
                            'project_id' => $projectId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                }
            });
        }

        // Setelah apps di DB sudah final, baru cek dan sync ke ticket
        $finalUserApps = DB::connection('pilargroup')
            ->table('central_user_projects as cup')
            ->join('master_projects as mp', 'cup.project_id', '=', 'mp.id')
            ->where('cup.user_id', $id)
            ->pluck('mp.slug')
            ->toArray();

        if (in_array('ticket', $finalUserApps)) {
            $department = null;
            if ($updatedUser->department_id) {
                $department = DB::connection('pilargroup')
                    ->table('master_departments')
                    ->where('id', $updatedUser->department_id)
                    ->value('name');
            }

            (new \App\Services\TicketService())->syncUser($updatedUser, $department, $oldUsername);
        }

        return response()->json(['message' => 'User updated successfully']);
    }

    // GET /api/users/{id} → detail user
    // DELETE /api/users/{id} -> delete user
    public function destroy($id)
    {
        $user = DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $id)
            ->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // Simpan username dan cek apps sebelum delete
        $username = $user->username;
        $userApps = DB::connection('pilargroup')
            ->table('central_user_projects as cup')
            ->join('master_projects as mp', 'cup.project_id', '=', 'mp.id')
            ->where('cup.user_id', $id)
            ->pluck('mp.slug')
            ->toArray();

        try {
            DB::connection('pilargroup')->transaction(function () use ($id) {
                DB::connection('pilargroup')
                    ->table('central_user_projects')
                    ->where('user_id', $id)
                    ->delete();

                DB::connection('pilargroup')
                    ->table('central_users')
                    ->where('id', $id)
                    ->delete();
            });

            // Sync delete ke ticket kalau user punya akses ticket
            if (in_array('ticket', $userApps)) {
                (new \App\Services\TicketService())->deleteUser($username);
            }


            (new SnipeItService())->deleteUser($username);


            return response()->json(['message' => 'User deleted successfully']);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error deleting user',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function show($id)
    {
        $user = DB::connection('pilargroup')
            ->table('central_users as cu')
            ->leftJoin('master_departments as md', 'cu.department_id', '=', 'md.id')
            ->leftJoin('master_job_levels as mjl', 'cu.job_level_id', '=', 'mjl.id')
            ->select('cu.*', 'md.name as department', 'mjl.name as job_level', 'mjl.level as job_level_value')
            ->where('cu.id', $id)
            ->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $user->apps = DB::connection('pilargroup')
            ->table('central_user_projects as cup')
            ->join('master_projects as mp', 'cup.project_id', '=', 'mp.id')
            ->where('cup.user_id', $id)
            ->pluck('mp.slug')
            ->toArray();

        return response()->json($user);
    }
}
