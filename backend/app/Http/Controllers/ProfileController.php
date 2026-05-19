<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Services\TicketService;
use App\Services\SnipeItService;

class ProfileController extends Controller
{
    // ─────────────────────────────────────────────
    // HELPER: ambil primary department name dari pivot
    // ─────────────────────────────────────────────
    private function getPrimaryDepartmentName(string $userId): ?string
    {
        return DB::connection('pilargroup')
            ->table('central_user_departments as cud')
            ->join('master_departments as md', 'cud.department_id', '=', 'md.id')
            ->where('cud.user_id', $userId)
            ->orderByRaw('cud.is_primary DESC')
            ->value('md.name');
    }

    // ─────────────────────────────────────────────
    // PUT /api/auth/change-profile
    // ─────────────────────────────────────────────
    public function changeProfile(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_username'     => 'nullable|string|min:3',
            'new_password'     => 'nullable|string|min:6',
            'email'            => 'nullable|email',
            'phone'            => 'nullable|string|max:20',
        ]);

        if (!$request->new_username && !$request->new_password
            && $request->input('email') === null && $request->input('phone') === null) {
            return response()->json([
                'success' => false,
                'message' => 'Isi minimal new_username, new_password, email, atau phone untuk mengubah profile',
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

        $oldUsername = $user->username;
        $updates     = ['updated_at' => now()->toDateTimeString()];
        $changed     = [];

        if ($request->filled('new_username')) {
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

        if ($request->filled('new_password')) {
            $updates['password'] = Hash::make($request->new_password);
            $changed[] = 'password';
        }

        if ($request->input('email') !== null) {
            $updates['email'] = $request->input('email');
            $changed[] = 'email';
        }

        if ($request->input('phone') !== null) {
            $updates['phone'] = $request->input('phone');
            $changed[] = 'phone';
        }

        // Update central_users
        DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $userId)
            ->update($updates);

        // Ambil data terbaru setelah update
        // PENTING: harus setelah update(), bukan sebelum
        $updatedUser = DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $userId)
            ->first();

        $credentialChanged = in_array('username', $changed) || in_array('password', $changed);

        if ($credentialChanged) {
            DB::connection('pilargroup')
                ->table('central_users')
                ->where('id', $userId)
                ->increment('token_version');

            // forceRelogin pakai username terbaru (sudah terupdate di DB)
            (new SnipeItService())->forceRelogin($updatedUser->username);
            (new TicketService())->forceLogout($userId);
        }

        // Ambil apps user
        $userApps = DB::connection('pilargroup')
            ->table('central_user_projects as cup')
            ->join('master_projects as mp', 'cup.project_id', '=', 'mp.id')
            ->where('cup.user_id', $userId)
            ->pluck('mp.slug')
            ->toArray();

        // Primary department dari pivot (bukan department_id di central_users)
        $deptName = $this->getPrimaryDepartmentName($userId);

        // Sync Ticket kalau user punya akses
        if (in_array('ticket', $userApps)) {
            (new TicketService())->syncUser($updatedUser, $deptName, $oldUsername);
        }

        // Sync SnipeIt — job level
        $snipeJobLevel = null;
        if ($updatedUser->job_level_id) {
            $snipeJobLevel = DB::connection('pilargroup')
                ->table('master_job_levels')
                ->where('id', $updatedUser->job_level_id)
                ->value('name');
        }

        (new SnipeItService())->syncUser($updatedUser, $deptName, $snipeJobLevel, $oldUsername);

        return response()->json([
            'success' => true,
            'message' => 'Berhasil mengubah ' . implode(' dan ', $changed),
        ]);
    }
}