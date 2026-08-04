<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('user-imports:cleanup', function () {
    $baseDirectory = storage_path('app/private/user-imports');

    if (!File::isDirectory($baseDirectory)) {
        $this->info('User import temporary directory does not exist.');
        return 0;
    }

    $deleted = 0;
    $expirationTimestamp = now()->subHours(2)->timestamp;

    foreach (File::directories($baseDirectory) as $directory) {
        if (File::lastModified($directory) <= $expirationTimestamp) {
            File::deleteDirectory($directory);
            $deleted++;
        }
    }

    $this->info("Deleted {$deleted} expired user import batch(es).");
    return 0;
})->purpose('Delete expired temporary user import batches');

Schedule::command('user-imports:cleanup')->hourly();
