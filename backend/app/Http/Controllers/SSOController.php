<?php

namespace App\Http\Controllers;

use App\Models\CentralUser;
use App\Models\SsoClient;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Tymon\JWTAuth\Facades\JWTAuth;

class SSOController extends Controller
{
    /**
     * GET /sso/authorize?client_id=ticket&redirect_uri=https://...&state=xxx
     */
    public function authorize(Request $request)
    {
        $request->validate([
            'client_id'    => 'required|string',
            'redirect_uri' => 'required|url',
            'state'        => 'required|string',
        ]);

        $client = SsoClient::whereHas('project', function ($q) use ($request) {
            $q->where('slug', $request->client_id)
            ->where('is_active', 1);
        })->first();

        if (!$client) {
            abort(403, 'SSO client tidak ditemukan atau tidak aktif.');
        }

        if (!in_array($request->redirect_uri, $client->redirect_uris)) {
            abort(403, 'Redirect URI tidak valid.');
        }

        $claims = [
            'client_id'    => $request->client_id,
            'redirect_uri' => $request->redirect_uri,
            'state'        => $request->state,
        ];

        // Sudah login di pilargroup → langsung issue handoff token
        if (auth()->check()) {
            return $this->issueAndRedirect(auth()->user(), $claims);
        }

        // Belum login → encode context ke sso_token, redirect ke login page
        $ssoToken = \Firebase\JWT\JWT::encode([
            'iss'          => config('app.url'),
            'purpose'      => 'sso_context',
            'client_id'    => $request->client_id,
            'redirect_uri' => $request->redirect_uri,
            'state'        => $request->state,
            'exp'          => now()->addMinutes(10)->timestamp,
        ], config('jwt.secret'), 'HS256');

        return redirect(config('app.frontend_url') . '/login?sso_token=' . $ssoToken);
    }

    /**
     * Dipanggil dari AuthController setelah credentials valid
     * Return string URL (bukan redirect) supaya AuthController bisa return JSON ke React
     */
    public function issueAndRedirect(CentralUser $user, array $ssoClaims): string
    {
        $clientSlug  = $ssoClaims['client_id'];
        $redirectUri = $ssoClaims['redirect_uri'];
        $state       = $ssoClaims['state'];

        if (!$user->hasProjectAccess($clientSlug)) {
            Log::warning('SSO: user tidak punya akses', [
                'user_id'   => $user->id,
                'client_id' => $clientSlug,
            ]);

            return config('app.frontend_url') . '/login?error=access_denied&client=' . $clientSlug;
        }

        // Issue JWT handoff khusus SSO (5 menit)
        $handoffToken = JWTAuth::claims([
            'purpose'   => 'sso_handoff',
            'client_id' => $clientSlug,
        ])->fromUser($user);

        Log::info('SSO handoff issued', [
            'user_id'   => $user->id,
            'client_id' => $clientSlug,
        ]);

        return "{$redirectUri}?token={$handoffToken}&state={$state}";
    }

    /**
     * POST /api/sso/verify
     * Dipanggil oleh backend ticket untuk verifikasi handoff token
     */
    public function verify(Request $request)
    {
        $request->validate([
            'token'         => 'required|string',
            'client_id'     => 'required|string',
            'client_secret' => 'required|string',
        ]);

        $client = SsoClient::whereHas('project', function ($q) use ($request) {
            $q->where('slug', $request->client_id)
              ->where('is_active', 1);
        })->first();

        if (!$client) {
            return response()->json(['valid' => false, 'message' => 'Client tidak ditemukan.'], 404);
        }

        if (!Hash::check($request->client_secret, $client->client_secret)) {
            Log::warning('SSO verify: invalid client secret', ['client_id' => $request->client_id]);
            return response()->json(['valid' => false, 'message' => 'Client secret tidak valid.'], 401);
        }

        try {
            $payload = JWTAuth::setToken($request->token)->getPayload();

            if ($payload->get('purpose') !== 'sso_handoff') {
                return response()->json(['valid' => false, 'message' => 'Token bukan untuk SSO handoff.'], 401);
            }

            if ($payload->get('client_id') !== $request->client_id) {
                return response()->json(['valid' => false, 'message' => 'Token tidak untuk client ini.'], 401);
            }

            $user = CentralUser::findOrFail($payload->get('sub'));

            Log::info('SSO verify success', [
                'user_id'   => $user->id,
                'client_id' => $request->client_id,
            ]);

            return response()->json([
                'valid' => true,
                'user'  => [
                    'id'            => $user->id,
                    'internal_id'   => $user->internal_id,
                    'name'          => $user->name,
                    'username'      => $user->username,
                    'email'         => $user->email,
                    'phone'         => $user->phone,
                    'department'    => $user->department,
                    'department_id' => $user->department_id,
                    'job_position'  => $user->job_position,
                    'job_level'     => $user->job_level,
                    'is_active'     => $user->is_active,
                ],
            ]);

        } catch (\Tymon\JWTAuth\Exceptions\TokenExpiredException) {
            return response()->json(['valid' => false, 'message' => 'Token sudah expired.'], 401);
        } catch (\Tymon\JWTAuth\Exceptions\TokenInvalidException) {
            return response()->json(['valid' => false, 'message' => 'Token tidak valid.'], 401);
        } catch (\Exception $e) {
            Log::error('SSO verify error', ['error' => $e->getMessage()]);
            return response()->json(['valid' => false, 'message' => 'Terjadi kesalahan.'], 500);
        }
    }
}