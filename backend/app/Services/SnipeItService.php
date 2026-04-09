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

    public function findUser(string $username): ?array
    {
        if (empty($this->token)) return null;

        $response = Http::withToken($this->token)
            ->get("{$this->baseUrl}/api/v1/users", [
                'search' => $username,
                'limit'  => 1,
            ]);

        if (!$response->successful()) return null;

        $rows = $response->json('rows') ?? [];
        return collect($rows)->firstWhere('username', $username);
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

        $match = $this->findUser($user->username);

        if ($match) {
            $snipeId  = $match['id'];
            $response = Http::withToken($this->token)
                ->patch("{$this->baseUrl}/api/v1/users/{$snipeId}", $payload);

            if ($response->successful()) {
                Log::info("SnipeIt sync: user {$user->username} updated (id: {$snipeId})");
            } else {
                Log::error("SnipeIt sync update failed for {$user->username}: " . $response->body());
            }
        } else {
            $password            = bin2hex(random_bytes(16));
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