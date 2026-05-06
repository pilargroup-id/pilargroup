<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Services\TicketService;
use App\Services\SnipeItService;

class ProfileController extends Controller
{
    public function changeProfile(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_username'     => 'nullable|string|min:3',
            'new_password'     => 'nullable|string|min:6',
            'email'            => 'nullable|email',
            'phone'            => 'nullable|string|max:20',
        ]);

        if (!$request->new_username && !$request->new_password && !$request->email && !$request->phone) {
            return response()->json([
                'success' => false,
                'message' => 'Isi minimal new_username atau new_password atau email atau phone untuk mengubah profile',
            ], 422);
        }

        $userId = $request->user_id;

        $user = DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $userId)
            ->where('is_active', 1)
            ->first();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['success' => false, 'message' => 'Password saat ini salah'], 401);
        }

        $updates = ['updated_at' => now()->toDateTimeString()];
        $changed = [];

        if ($request->new_username) {
            $exists = DB::connection('pilargroup')
                ->table('central_users')
                ->where('username', $request->new_username)
                ->where('id', '!=', $userId)
                ->exists();

            if ($exists) {
                return response()->json(['success' => false, 'message' => 'Username sudah digunakan'], 422);
            }

            $updates['username'] = $request->new_username;
            $changed[] = 'username';
        }

        if ($request->new_password) {
            $updates['password'] = Hash::make($request->new_password);
            $changed[] = 'password';
        }

        if ($request->input('email') !== null) { $updates['email'] = $request->input('email'); $changed[] = 'email'; }
        if ($request->input('phone') !== null) { $updates['phone'] = $request->input('phone'); $changed[] = 'phone'; }

        $oldUsername = $user->username;

        DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $userId)
            ->update($updates);

        $credentialChanged = in_array('username', $changed) || in_array('password', $changed);

        if ($credentialChanged) {
            DB::connection('pilargroup')
                ->table('central_users')
                ->where('id', $userId)
                ->increment('token_version');

            (new SnipeItService())->forceRelogin($updatedUser->username);
            (new TicketService())->forceLogout($userId);
        }

        // Ambil data user terbaru setelah update
        $updatedUser = DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $userId)
            ->first();

        // Cek apakah user punya akses ticket
        $userApps = DB::connection('pilargroup')
            ->table('central_user_projects as cup')
            ->join('master_projects as mp', 'cup.project_id', '=', 'mp.id')
            ->where('cup.user_id', $userId)
            ->pluck('mp.slug')
            ->toArray();

        if (in_array('ticket', $userApps)) {
            $department = null;
            if ($updatedUser->department_id) {
                $department = DB::connection('pilargroup')
                    ->table('master_departments')
                    ->where('id', $updatedUser->department_id)
                    ->value('name');
            }

            (new TicketService())->syncUser($updatedUser, $department, $oldUsername);
        }

        
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

            (new \App\Services\SnipeItService())->syncUser($updatedUser, $snipeDept, $snipeJobLevel, $oldUsername);
        

        return response()->json([
            'success' => true,
            'message' => 'Berhasil mengubah ' . implode(' dan ', $changed),
        ]);
    }
}