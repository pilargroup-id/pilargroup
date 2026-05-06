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
                'search'       => $username,
                'search_field' => 'username',
                'limit'        => 10,
            ]);

        if (!$response->successful()) {
            Log::error("SnipeIt findUser failed for {$username}: " . $response->body());
            return null;
        }

        $rows = $response->json('rows') ?? [];
        return collect($rows)->firstWhere('username', $username);
    }

    /**
     * Cari department_id di assetit berdasarkan nama department
     */
    private function findDepartmentId(?string $departmentName): ?int
    {
        if (empty($departmentName) || empty($this->token)) return null;

        $response = Http::withToken($this->token)
            ->get("{$this->baseUrl}/api/v1/departments", [
                'search' => $departmentName,
                'limit'  => 20,
            ]);

        if (!$response->successful()) return null;

        $rows = $response->json('rows') ?? [];
        $match = collect($rows)->first(function ($dept) use ($departmentName) {
            return strtolower(trim($dept['name'])) === strtolower(trim($departmentName));
        });

        return $match ? $match['id'] : null;
    }

    public function syncUser(object $user, ?string $department = null, ?string $jobLevel = null, ?string $oldUsername = null): void
    {
        if (empty($this->token)) {
            Log::warning('SnipeIt sync skipped: SNIPEIT_API_TOKEN not set');
            return;
        }

        $nameParts = explode(' ', trim($user->name));
        $firstName = $nameParts[0];
        $lastName  = implode(' ', array_slice($nameParts, 1)) ?: $nameParts[0];

        $jobPosition = $user->job_position ?? null;
        $jobtitle = null;
        if ($jobPosition && $jobLevel) {
            $jobtitle = "{$jobPosition} ({$jobLevel})";
        } elseif ($jobPosition) {
            $jobtitle = $jobPosition;
        } elseif ($jobLevel) {
            $jobtitle = $jobLevel;
        }

        $departmentId = $this->findDepartmentId($department);

        $payload = [
            'username'   => $user->username,
            'first_name' => $firstName,
            'last_name'  => $lastName,
            'email'      => $user->email ?? '',
            'activated'  => true,
            'jobtitle'   => $jobtitle,
        ];

        if ($departmentId) {
            $payload['department_id'] = $departmentId;
        }

        // Lookup by old_username dulu, fallback ke username baru
        $lookupUsername = $oldUsername ?? $user->username;
        $match = $this->findUser($lookupUsername);

        if ($match) {
            $snipeId  = $match['id'];
            $response = Http::withToken($this->token)
                ->patch("{$this->baseUrl}/api/v1/users/{$snipeId}", $payload);

            if ($response->successful()) {
                Log::info("SnipeIt sync: user {$lookupUsername} updated to {$user->username} (id: {$snipeId})");
            } else {
                Log::error("SnipeIt sync update failed for {$lookupUsername}: " . $response->body());
            }
        } else {
            // Create baru
            $password = bin2hex(random_bytes(16));
            $payload['password'] = $password;
            $payload['password_confirmation'] = $password;
            $payload['permissions'] = json_encode([
                "superuser" => "0", "admin" => "0", "import" => "0",
                "reports.view" => "0", "assets.view" => "0", "assets.create" => "0",
                "assets.edit" => "0", "assets.delete" => "0", "assets.checkin" => "0",
                "assets.checkout" => "0", "assets.audit" => "0",
                "assets.view.requestable" => "0", "assets.view.encrypted_custom_fields" => "0",
                "accessories.view" => "0", "accessories.create" => "0",
                "accessories.edit" => "0", "accessories.delete" => "0",
                "accessories.checkout" => "0", "accessories.checkin" => "0",
                "accessories.files" => "0", "consumables.view" => "0",
                "consumables.create" => "0", "consumables.edit" => "0",
                "consumables.delete" => "0", "consumables.checkout" => "0",
                "consumables.files" => "0", "licenses.view" => "0",
                "licenses.create" => "0", "licenses.edit" => "0",
                "licenses.delete" => "0", "licenses.checkout" => "0",
                "licenses.keys" => "0", "licenses.files" => "0",
                "components.view" => "0", "components.create" => "0",
                "components.edit" => "0", "components.delete" => "0",
                "components.checkout" => "0", "components.checkin" => "0",
                "components.files" => "0", "kits.view" => "0",
                "kits.create" => "0", "kits.edit" => "0",
                "kits.delete" => "0", "users.view" => "0",
                "users.create" => "0", "users.edit" => "0",
                "users.delete" => "0", "models.view" => "0",
                "models.create" => "0", "models.edit" => "0",
                "models.delete" => "0", "categories.view" => "0",
                "categories.create" => "0", "categories.edit" => "0",
                "categories.delete" => "0", "departments.view" => "0",
                "departments.create" => "0", "departments.edit" => "0",
                "departments.delete" => "0", "statuslabels.view" => "0",
                "statuslabels.create" => "0", "statuslabels.edit" => "0",
                "statuslabels.delete" => "0", "customfields.view" => "0",
                "customfields.create" => "0", "customfields.edit" => "0",
                "customfields.delete" => "0", "suppliers.view" => "0",
                "suppliers.create" => "0", "suppliers.edit" => "0",
                "suppliers.delete" => "0", "manufacturers.view" => "0",
                "manufacturers.create" => "0", "manufacturers.edit" => "0",
                "manufacturers.delete" => "0", "depreciations.view" => "0",
                "depreciations.create" => "0", "depreciations.edit" => "0",
                "depreciations.delete" => "0", "locations.view" => "0",
                "locations.create" => "0", "locations.edit" => "0",
                "locations.delete" => "0", "companies.view" => "0",
                "companies.create" => "0", "companies.edit" => "0",
                "companies.delete" => "0", "self.two_factor" => "0",
                "self.api" => "0", "self.edit_location" => "0",
                "self.checkout_assets" => "0", "self.view_purchase_cost" => "0",
            ]);

            $response = Http::withToken($this->token)
                ->post("{$this->baseUrl}/api/v1/users", $payload);

            if ($response->successful()) {
                Log::info("SnipeIt sync: user {$user->username} created");
            } else {
                Log::error("SnipeIt sync create failed for {$user->username}: " . $response->body());
            }
        }
    }

    public function forceRelogin(string $username): void
    {
        if (empty($this->token)) return;

        $match = $this->findUser($username);
        if (!$match) return;

        $snipeId = $match['id'];

        Http::withToken($this->token)
            ->patch("{$this->baseUrl}/api/v1/users/{$snipeId}", ['activated' => false]);

        Http::withToken($this->token)
            ->patch("{$this->baseUrl}/api/v1/users/{$snipeId}", ['activated' => true]);

        Log::info("SnipeIt forceRelogin: {$username}");
    }

    public function deleteUser(string $username): void
    {
        if (empty($this->token)) return;

        $match = $this->findUser($username);

        if (!$match) {
            Log::warning("SnipeIt deleteUser: user {$username} tidak ditemukan");
            return;
        }

        $snipeId  = $match['id'];
        $response = Http::withToken($this->token)
            ->delete("{$this->baseUrl}/api/v1/users/{$snipeId}");

        if ($response->successful()) {
            Log::info("SnipeIt deleteUser: user {$username} deleted (id: {$snipeId})");
        } else {
            Log::error("SnipeIt deleteUser failed for {$username}: " . $response->body());
        }
    }
}