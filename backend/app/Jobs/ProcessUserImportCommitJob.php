<?php

namespace App\Jobs;

use App\Http\Controllers\UserImportController;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessUserImportCommitJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 900;

    public function __construct(
        private readonly string $batchId,
        private readonly bool $canManageApps,
    ) {
    }

    public function handle(UserImportController $controller): void
    {
        $controller->processCommitBatch($this->batchId, $this->canManageApps);
    }
}
