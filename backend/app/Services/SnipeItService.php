<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SnipeItService
{
    private string $baseUrl;
    private string $token;

    public function __construct()
    {
        $this->baseUrl = env('SNIPEIT_API_URL', 'https://assetit.pilargroup.id');
        $this->token   = env('SNIPEIT_API_TOKEN', '');
    }

    public function syncUser(object $user): void
    {
        if (empty($this->token)) {
            Log::warning('SnipeIt sync skipped: SNIPEIT_API_TOKEN not set');
            return;
        }

        $nameParts = explode(' ', trim($user->name));
        $firstName = $nameParts[0];
        $lastName  = implode(' ', array_slice($nameParts, 1)) ?: $nameParts[0];

        $payload = [
            'username'   => $user->username,
            'first_name' => $firstName,
            'last_name'  => $lastName,
            'email'      => $user->email ?? '',
            'activated'  => true,
        ];

        // Cek apakah user sudah ada di Snipe-IT
        $existing = Http::withToken($this->token)
            ->get("{$this->baseUrl}/api/v1/users", [
                'search' => $user->username,
                'limit'  => 1,
            ]);

        if (!$existing->successful()) {
            Log::error("SnipeIt sync: failed to search user {$user->username}: " . $existing->body());
            return;
        }

        $rows = $existing->json('rows') ?? [];
        $match = collect($rows)->firstWhere('username', $user->username);

        if ($match) {
            // User sudah ada → update
            $snipeId = $match['id'];
            $response = Http::withToken($this->token)
                ->patch("{$this->baseUrl}/api/v1/users/{$snipeId}", $payload);

            if ($response->successful()) {
                Log::info("SnipeIt sync: user {$user->username} updated (id: {$snipeId})");
            } else {
                Log::error("SnipeIt sync update failed for {$user->username}: " . $response->body());
            }
        } else {
            // User belum ada → create
            $password = bin2hex(random_bytes(16));
            $payload['password'] = $password;
            $payload['password_confirmation'] = $password;

            $response = Http::withToken($this->token)
                ->post("{$this->baseUrl}/api/v1/users", $payload);

            if ($response->successful()) {
                Log::info("SnipeIt sync: user {$user->username} created");
            } else {
                Log::error("SnipeIt sync create failed for {$user->username}: " . $response->body());
            }
        }
    }
}