<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Models\CentralUser;

class AuthController extends Controller
{
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

        // Ambil semua apps user, tanpa filter spesifik
        $apps = DB::connection('pilargroup')
            ->table('central_user_projects as cup')
            ->join('master_projects as mp', 'cup.project_id', '=', 'mp.id')
            ->where('cup.user_id', $user->id)
            ->pluck('mp.slug')
            ->toArray();

        $token = JWTAuth::claims(['apps' => $apps])->fromUser($user);

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'           => $user->id,
                'internal_id'  => $user->internal_id,
                'username'     => $user->username,
                'name'         => $user->name,
                'department'   => $user->department,
                'job_position' => $user->job_position,
                'job_level'    => $user->job_level,
                'apps'         => $apps,
            ]
        ]);
    }

    public function me(Request $request)
    {
        return response()->json(auth('api')->user());
    }

    public function logout()
    {
        JWTAuth::invalidate(JWTAuth::getToken());
        return response()->json(['message' => 'Logged out successfully']);
    }
}