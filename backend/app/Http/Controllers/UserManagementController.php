<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class UserManagementController extends Controller
{
    // GET /api/users → list semua user
    public function index()
    {
        $users = DB::connection('pilargroup')
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
                'cu.job_level',
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
            'job_level'     => 'nullable|string',
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
                    'job_level'     => $request->input('job_level'),
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
        $request->validate([
            'username'      => 'nullable|string|min:3',
            'password'      => 'nullable|string|min:6',
            'name'          => 'nullable|string',
            'email'         => 'nullable|email',
            'phone'         => 'nullable|string|max:20',
            'department_id' => 'nullable|integer|exists:pilargroup.master_departments,id',
            'job_position'  => 'nullable|string',
            'job_level'     => 'nullable|string',
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

        $now = now()->toDateTimeString();
        $updates = ['updated_at' => $now];

        if ($request->input('username')) {
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

        if ($request->input('password'))     $updates['password']       = Hash::make($request->input('password'));
        if ($request->input('name'))         $updates['name']           = $request->input('name');
        if ($request->input('email') !== null) $updates['email']        = $request->input('email');
        if ($request->input('phone') !== null) $updates['phone']        = $request->input('phone');
        if ($request->input('department_id')) $updates['department_id'] = $request->input('department_id');
        if ($request->input('job_position')) $updates['job_position']   = $request->input('job_position');
        if ($request->input('job_level'))    $updates['job_level']      = $request->input('job_level');
        if (!is_null($request->input('is_active'))) $updates['is_active'] = $request->input('is_active');

        if ($request->input('internal_id')) {
            $internalIdExists = DB::connection('pilargroup')
                ->table('central_users')
                ->where('internal_id', $request->input('internal_id'))
                ->where('id', '!=', $id)
                ->exists();

            if ($internalIdExists) {
                return response()->json(['message' => 'Internal ID already exists'], 422);
            }
            $updates['internal_id'] = $request->input('internal_id');
        }

        DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $id)
            ->update($updates);

        if ($request->input('apps') !== null) {
            $projectIds = DB::connection('pilargroup')
                ->table('master_projects')
                ->whereIn('slug', $request->input('apps'))
                ->pluck('id');

            // Hapus semua relasi lama lalu insert baru
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
        }

        return response()->json(['message' => 'User updated successfully']);
    }

    // GET /api/users/{id} → detail user
    public function show($id)
    {
        $user = DB::connection('pilargroup')
            ->table('central_users as cu')
            ->leftJoin('master_departments as md', 'cu.department_id', '=', 'md.id')
            ->select('cu.*', 'md.name as department')
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