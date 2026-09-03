<?php

namespace App\Jobs;

use App\Services\SnipeItService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class SyncSnipeItUserJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 60;
    public int $backoff = 10;

    public function __construct(
        private readonly string $type,
        private readonly ?string $userId = null,
        private readonly ?string $oldUsername = null,
        private readonly ?string $username = null,
    ) {
    }

    public function handle(): void
    {
        $service = new SnipeItService();

        if ($this->type === 'relogin') {
            $service->forceRelogin($this->username);
            return;
        }

        $user = DB::connection('pilargroup')
            ->table('central_users')
            ->where('id', $this->userId)
            ->first();

        if (!$user) {
            return;
        }

        $departmentName = DB::connection('pilargroup')
            ->table('central_user_departments as cud')
            ->join('master_departments as md', 'cud.department_id', '=', 'md.id')
            ->where('cud.user_id', $user->id)
            ->orderByRaw('cud.is_primary DESC')
            ->value('md.name');

        $jobLevelName = $user->job_level_id
            ? DB::connection('pilargroup')->table('master_job_levels')->where('id', $user->job_level_id)->value('name')
            : null;

        $service->syncUser($user, $departmentName, $jobLevelName, $this->oldUsername);
    }
}
