<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TicketService
{
    protected string $baseUrl;
    protected string $secret;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.ticket.url'), '/');
        $this->secret  = config('services.ticket.internal_secret');
    }

    /**
     * Sync user ke ticket (create jika belum ada, update jika sudah ada)
     * Dipanggil setelah store/update user di pilargroup
     */
    public function syncUser(object $user, ?string $department = null): void
    {
        if (!$this->baseUrl || !$this->secret) {
            Log::warning('TicketService: URL atau secret belum dikonfigurasi, sync dilewati.');
            return;
        }

        $payload = [
            'username'     => $user->username,
            'name'         => $user->name,
            'email'        => $user->email        ?? null,
            'phone'        => $user->phone        ?? null,
            'job_position' => $user->job_position ?? null,
            'department'   => $department,
        ];

        try {
            $response = Http::withHeaders([
                'X-Internal-Secret' => $this->secret,
                'Accept'            => 'application/json',
            ])->post($this->baseUrl . '/api/internal/sync-user', $payload);

            if ($response->successful()) {
                Log::info('TicketService: sync berhasil', [
                    'username' => $user->username,
                    'action'   => $response->json('action'),
                ]);
            } else {
                Log::warning('TicketService: sync gagal', [
                    'username' => $user->username,
                    'status'   => $response->status(),
                    'body'     => $response->body(),
                ]);
            }
        } catch (\Exception $e) {
            // Jangan sampai error sync menghentikan proses utama
            Log::error('TicketService: exception', [
                'username' => $user->username,
                'error'    => $e->getMessage(),
            ]);
        }
    }
}