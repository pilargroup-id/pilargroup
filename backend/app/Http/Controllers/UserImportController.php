<?php

namespace App\Http\Controllers;

use App\Services\SnipeItService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class UserImportController extends Controller
{
    private const USER_SHEET_NAME = 'Users';

    private const SUPPORTED_HEADERS = [
        'username',
        'password',
        'name',
        'email',
        'phone',
        'job_position',
        'job_level_id',
        'employment_type_code',
        'internal_id',
        'department_ids',
        'primary_department_id',
        'company_ids',
        'primary_company_id',
        'apps',
        'is_active',
    ];

    private const TEMPLATE_HEADERS = [
        'username',
        'password',
        'name',
        'email',
        'phone',
        'job_position',
        'job_level_id',
        'employment_type_code',
        'internal_id',
        'department_ids',
        'primary_department_id',
        'company_ids',
        'primary_company_id',
        'is_active',
    ];

    private const EMPLOYMENT_TYPE_CODES = ['UP', 'OS', 'HL'];

    private const DEFAULT_CREATE_APPS = ['ticket', 'overtime'];

    /**
     * Snipe-IT sync is network-bound and too slow to run inline for large
     * imports (causes gateway timeouts). Rows queue their sync here and it
     * runs after the HTTP response is already sent, see processRow() callers
     * and commit()'s app()->terminating() registration.
     */
    private array $pendingSnipeItSyncs = [];

    // ─────────────────────────────────────────────
    // GET /api/users/import-template
    // ─────────────────────────────────────────────
    public function downloadTemplate()
    {
        $spreadsheet = new Spreadsheet();

        $usersSheet = $spreadsheet->getActiveSheet();
        $usersSheet->setTitle(self::USER_SHEET_NAME);

        $headers = self::TEMPLATE_HEADERS;

        foreach ($headers as $index => $header) {
            $column = Coordinate::stringFromColumnIndex($index + 1);
            $usersSheet->setCellValue("{$column}1", $header);
        }

        $exampleRow = [
            'jdoe',
            'Welcome123',
            'John Doe',
            'john@example.com',
            '08123456789',
            'Manager',
            '5',
            'UP',
            '123',
            '8,1',
            '8',
            'comp-pnm-0001',
            'comp-pnm-0001',
            '1',
        ];

        foreach ($exampleRow as $index => $value) {
            $column = Coordinate::stringFromColumnIndex($index + 1);
            $usersSheet->setCellValue("{$column}2", $value);
        }

        $this->autoSizeColumns($usersSheet, count($headers));

        $this->addJobLevelsReferenceSheet($spreadsheet);
        $this->addDepartmentsReferenceSheet($spreadsheet);
        $this->addCompaniesReferenceSheet($spreadsheet);
        $this->addAppsReferenceSheet($spreadsheet);
        $this->addEmploymentTypeReferenceSheet($spreadsheet);

        $fileName = 'users_import_template_' . now()->format('Ymd_His') . '.xlsx';
        $filePath = storage_path("app/{$fileName}");

        $writer = new Xlsx($spreadsheet);
        $writer->save($filePath);

        return response()->download($filePath, $fileName)->deleteFileAfterSend(true);
    }

    // ─────────────────────────────────────────────
    // POST /api/users/import/preview
    // ─────────────────────────────────────────────
    public function preview(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        $batchId = Str::uuid()->toString();
        $batchDirectory = $this->getBatchDirectory($batchId);

        try {
            File::ensureDirectoryExists($batchDirectory);

            $sourceExtension = strtolower($request->file('file')->getClientOriginalExtension() ?: 'xlsx');
            $sourceFileName = "source.{$sourceExtension}";
            $sourcePath = $batchDirectory . DIRECTORY_SEPARATOR . $sourceFileName;
            $request->file('file')->move($batchDirectory, $sourceFileName);

            $spreadsheet = IOFactory::load($sourcePath);
            $sheet = $spreadsheet->getSheetByName(self::USER_SHEET_NAME) ?? $spreadsheet->getActiveSheet();
            $headerMap = $this->getHeaderMap($sheet);

            if (!isset($headerMap['username'])) {
                File::deleteDirectory($batchDirectory);

                return response()->json([
                    'message' => 'Invalid import file. Header username is required.',
                ], 422);
            }

            $unknownHeaders = array_values(array_diff(array_keys($headerMap), self::SUPPORTED_HEADERS));

            if (count($unknownHeaders) > 0) {
                File::deleteDirectory($batchDirectory);

                return response()->json([
                    'message' => 'Invalid import file. Unknown header found.',
                    'unknown_headers' => $unknownHeaders,
                    'supported_headers' => self::SUPPORTED_HEADERS,
                ], 422);
            }

            $rows = [];
            $seenUsernames = [];
            $seenInternalIds = [];
            $highestRow = $sheet->getHighestDataRow();

            $summary = [
                'total' => 0,
                'valid' => 0,
                'invalid' => 0,
                'create' => 0,
                'update' => 0,
                'skip' => 0,
            ];

            for ($rowNumber = 2; $rowNumber <= $highestRow; $rowNumber++) {
                $rowData = $this->getRowData($sheet, $headerMap, $rowNumber);

                if (count($rowData) === 0) {
                    continue;
                }

                $summary['total']++;
                $previewRow = $this->buildPreviewRow(
                    $rowData,
                    $rowNumber,
                    $seenUsernames,
                    $seenInternalIds,
                    (bool) $request->input('auth_import_can_manage_apps', false)
                );

                if ($previewRow['status'] === 'INVALID') {
                    $summary['invalid']++;
                } else {
                    $summary['valid']++;
                    $summary[strtolower($previewRow['action'])]++;
                }

                $rows[] = $previewRow;
            }

            $batch = [
                'batch_id' => $batchId,
                'created_by' => (string) $request->user_id,
                'created_by_can_manage_apps' => (bool) $request->input('auth_import_can_manage_apps', false),
                'status' => 'PREVIEWED',
                'original_filename' => $request->file('file')->getClientOriginalName(),
                'source_file' => $sourceFileName,
                'created_at' => now()->toIso8601String(),
                'expires_at' => now()->addHours(2)->toIso8601String(),
                'summary' => $summary,
                'rows' => $rows,
            ];

            $this->writeBatch($batchId, $batch);

            if ($summary['invalid'] > 0) {
                $this->writeInvalidWorkbook($batchId, $rows);
            }

            return response()->json([
                'message' => 'User import preview generated',
                'batch_id' => $batchId,
                'expires_at' => $batch['expires_at'],
                'summary' => $summary,
                'rows' => array_map(fn (array $row) => $this->sanitizePreviewRow($row), $rows),
            ]);
        } catch (\Throwable $e) {
            File::deleteDirectory($batchDirectory);

            return response()->json([
                'message' => 'Error while generating user import preview',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // ─────────────────────────────────────────────
    // POST /api/users/import/{batchId}/commit
    // ─────────────────────────────────────────────
    public function commit(Request $request, string $batchId)
    {
        $batch = $this->readOwnedBatch($batchId, (string) $request->user_id);

        if ($batch instanceof \Illuminate\Http\JsonResponse) {
            return $batch;
        }

        if (($batch['status'] ?? null) !== 'PREVIEWED') {
            return response()->json([
                'message' => 'Import batch is not available for commit.',
                'status' => $batch['status'] ?? null,
            ], 409);
        }

        if (now()->greaterThan(\Carbon\Carbon::parse($batch['expires_at']))) {
            File::deleteDirectory($this->getBatchDirectory($batchId));

            return response()->json([
                'message' => 'Import batch has expired.',
            ], 410);
        }

        $batch['status'] = 'PROCESSING';
        $this->writeBatch($batchId, $batch);

        $summary = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'invalid' => 0,
            'failed_during_commit' => 0,
        ];

        $finalRows = [];

        $canManageApps = (bool) $request->input('auth_import_can_manage_apps', false);

        foreach ($batch['rows'] as $row) {
            $rowHasApps = !empty($row['source_data']['apps'] ?? null);

            if ($rowHasApps && !$canManageApps) {
                $row['status'] = 'INVALID';
                $row['action'] = null;
                $row['errors'][] = 'Application access can only be managed by IT users.';
                $row['errors'] = array_values(array_unique($row['errors']));
                $row['commit_status'] = 'FAILED';
                $row['commit_message'] = 'Application access permission was rejected during commit validation.';
                $summary['invalid']++;
                $finalRows[] = $row;
                continue;
            }

            if (($row['status'] ?? null) === 'INVALID') {
                $summary['invalid']++;
                $finalRows[] = $row;
                continue;
            }

            if (($row['action'] ?? null) === 'SKIP') {
                $summary['skipped']++;
                $row['commit_status'] = 'SKIPPED';
                $finalRows[] = $row;
                continue;
            }

            $result = $this->processRow($row['source_data'], (int) $row['row']);

            if (in_array($result['status'], ['created', 'updated', 'skipped'], true)) {
                $summary[$result['status']]++;
                $row['commit_status'] = strtoupper($result['status']);
                $row['commit_message'] = $result['message'];
            } else {
                $summary['failed_during_commit']++;
                $row['status'] = 'INVALID';
                $row['action'] = null;
                $row['errors'][] = 'Commit failed: ' . $result['message'];
                $row['commit_status'] = 'FAILED';
                $row['commit_message'] = $result['message'];
            }

            $finalRows[] = $row;
        }

        $batch['status'] = 'COMMITTED';
        $batch['committed_at'] = now()->toIso8601String();
        $batch['commit_summary'] = $summary;
        $batch['rows'] = $finalRows;

        if (count($this->pendingSnipeItSyncs) > 0) {
            $pendingSyncs = $this->pendingSnipeItSyncs;

            app()->terminating(function () use ($pendingSyncs) {
                $this->processDeferredSnipeItSyncs($pendingSyncs);
            });
        }

        $invalidRows = array_values(array_filter(
            $finalRows,
            fn (array $row) => ($row['status'] ?? null) === 'INVALID'
        ));

        if (count($invalidRows) > 0) {
            $this->writeInvalidWorkbook($batchId, $invalidRows);
            $this->writeBatch($batchId, $batch);

            return response()->json([
                'message' => 'User import committed',
                'batch_id' => $batchId,
                'summary' => $summary,
                'invalid_file_url' => url("/api/users/import/{$batchId}/invalid-file"),
            ]);
        }

        File::deleteDirectory($this->getBatchDirectory($batchId));

        return response()->json([
            'message' => 'User import committed',
            'batch_id' => $batchId,
            'summary' => $summary,
            'invalid_file_url' => null,
        ]);
    }

    // ─────────────────────────────────────────────
    // DELETE /api/users/import/{batchId}
    // ─────────────────────────────────────────────
    public function cancel(Request $request, string $batchId)
    {
        $batch = $this->readOwnedBatch($batchId, (string) $request->user_id);

        if ($batch instanceof \Illuminate\Http\JsonResponse) {
            return $batch;
        }

        File::deleteDirectory($this->getBatchDirectory($batchId));

        return response()->json([
            'message' => 'User import batch canceled.',
            'batch_id' => $batchId,
        ]);
    }

    // ─────────────────────────────────────────────
    // GET /api/users/import/{batchId}/invalid-file
    // ─────────────────────────────────────────────
    public function downloadInvalidFile(Request $request, string $batchId)
    {
        $batch = $this->readOwnedBatch($batchId, (string) $request->user_id);

        if ($batch instanceof \Illuminate\Http\JsonResponse) {
            return $batch;
        }

        if (($batch['status'] ?? null) !== 'COMMITTED') {
            return response()->json([
                'message' => 'Invalid file is only available after commit.',
            ], 409);
        }

        $filePath = $this->getBatchDirectory($batchId) . DIRECTORY_SEPARATOR . 'invalid.xlsx';

        if (!File::exists($filePath)) {
            return response()->json([
                'message' => 'No invalid rows file is available for this batch.',
            ], 404);
        }

        $downloadName = 'users_import_invalid_' . now()->format('Ymd_His') . '.xlsx';
        $batchDirectory = $this->getBatchDirectory($batchId);

        app()->terminating(function () use ($batchDirectory) {
            File::deleteDirectory($batchDirectory);
        });

        return response()->download($filePath, $downloadName);
    }

    private function buildPreviewRow(
        array $rowData,
        int $rowNumber,
        array &$seenUsernames,
        array &$seenInternalIds,
        bool $canManageApps
    ): array {
        $username = trim((string) ($rowData['username'] ?? ''));
        $user = $username !== ''
            ? DB::connection('pilargroup')->table('central_users')->where('username', $username)->first()
            : null;

        $errors = $user
            ? $this->validateUpdateRow($rowData, $user->id)
            : $this->validateCreateRow($rowData);

        if (!empty($rowData['apps']) && !$canManageApps) {
            $errors[] = 'Application access can only be managed by IT users.';
        }

        $normalizedUsername = strtolower($username);
        if ($normalizedUsername !== '') {
            if (isset($seenUsernames[$normalizedUsername])) {
                $errors[] = "Duplicate username in import file. First found at row {$seenUsernames[$normalizedUsername]}.";
            } else {
                $seenUsernames[$normalizedUsername] = $rowNumber;
            }
        }

        $internalId = trim((string) ($rowData['internal_id'] ?? ''));
        if ($internalId !== '') {
            if (isset($seenInternalIds[$internalId])) {
                $errors[] = "Duplicate internal ID in import file. First found at row {$seenInternalIds[$internalId]}.";
            } else {
                $seenInternalIds[$internalId] = $rowNumber;
            }
        }

        $changes = [];
        $action = $user ? 'UPDATE' : 'CREATE';

        if ($user && count($errors) === 0) {
            $changes = $this->buildUserChanges($user, $rowData);
            if (count($changes) === 0) {
                $action = 'SKIP';
            }
        }

        if (!$user && count($errors) === 0) {
            $changes = $this->buildCreateChanges($rowData);
        }

        return [
            'row' => $rowNumber,
            'username' => $username !== '' ? $username : null,
            'status' => count($errors) > 0 ? 'INVALID' : 'VALID',
            'action' => count($errors) > 0 ? null : $action,
            'changes' => $changes,
            'errors' => array_values(array_unique($errors)),
            'source_data' => $rowData,
        ];
    }

    private function buildCreateChanges(array $rowData): array
    {
        $changes = [];

        foreach ($rowData as $field => $value) {
            if ($field === 'apps') {
                continue;
            }

            $changes[$field] = [
                'old' => null,
                'new' => $field === 'password' ? 'Password will be set' : $value,
            ];
        }

        $changes['apps'] = [
            'old' => null,
            'new' => $this->buildCreateAppSlugs($rowData),
        ];

        return $changes;
    }

    private function buildUserChanges($user, array $rowData): array
    {
        $changes = [];

        if (!empty($rowData['password'])) {
            $changes['password'] = [
                'old' => '********',
                'new' => 'Password will be changed',
            ];
        }

        foreach ([
            'name',
            'email',
            'phone',
            'job_position',
            'job_level_id',
            'employment_type_code',
            'internal_id',
        ] as $field) {
            if (!array_key_exists($field, $rowData) || $rowData[$field] === null || $rowData[$field] === '') {
                continue;
            }

            $oldValue = $user->{$field} ?? null;
            $newValue = $rowData[$field];

            if ((string) $oldValue !== (string) $newValue) {
                $changes[$field] = ['old' => $oldValue, 'new' => $newValue];
            }
        }

        if (array_key_exists('is_active', $rowData) && $rowData['is_active'] !== null && $rowData['is_active'] !== '') {
            $oldValue = (int) $user->is_active;
            $newValue = $this->parseBoolean($rowData['is_active']);

            if ($oldValue !== $newValue) {
                $changes['is_active'] = ['old' => $oldValue, 'new' => $newValue];
            }
        }

        if (!empty($rowData['department_ids'])) {
            $oldDepartmentIds = $this->getUserDepartmentIds($user->id);
            $newDepartmentIds = array_values(array_unique(array_map('intval', $this->parseList($rowData['department_ids']))));
            sort($oldDepartmentIds);
            sort($newDepartmentIds);

            if ($oldDepartmentIds !== $newDepartmentIds) {
                $changes['department_ids'] = ['old' => $oldDepartmentIds, 'new' => $newDepartmentIds];
            }

            $oldPrimary = (int) $this->getPrimaryDepartmentId($user->id);
            $newPrimary = !empty($rowData['primary_department_id'])
                ? (int) $rowData['primary_department_id']
                : ($newDepartmentIds[0] ?? null);

            if ($oldPrimary !== $newPrimary) {
                $changes['primary_department_id'] = ['old' => $oldPrimary, 'new' => $newPrimary];
            }
        }

        if (!empty($rowData['company_ids'])) {
            $oldCompanyIds = array_map('strval', $this->getUserCompanyIds($user->id));
            $newCompanyIds = array_values(array_unique(array_map('strval', $this->parseList($rowData['company_ids']))));
            sort($oldCompanyIds);
            sort($newCompanyIds);

            if ($oldCompanyIds !== $newCompanyIds) {
                $changes['company_ids'] = ['old' => $oldCompanyIds, 'new' => $newCompanyIds];
            }

            $oldPrimary = (string) $this->getPrimaryCompanyId($user->id);
            $newPrimary = !empty($rowData['primary_company_id'])
                ? (string) $rowData['primary_company_id']
                : ($newCompanyIds[0] ?? null);

            if ($oldPrimary !== (string) $newPrimary) {
                $changes['primary_company_id'] = ['old' => $oldPrimary, 'new' => $newPrimary];
            }
        }

        if (!empty($rowData['apps'])) {
            $oldApps = $this->getUserAppSlugs($user->id);
            $newApps = $this->parseList($rowData['apps']);
            sort($oldApps);
            sort($newApps);

            if ($oldApps !== $newApps) {
                $changes['apps'] = ['old' => $oldApps, 'new' => $newApps];
            }
        }

        return $changes;
    }

    private function sanitizePreviewRow(array $row): array
    {
        unset($row['source_data']);
        return $row;
    }

    private function getBatchDirectory(string $batchId): string
    {
        if (!preg_match('/^[a-f0-9-]{36}$/i', $batchId)) {
            abort(404);
        }

        return storage_path('app/private/user-imports/' . $batchId);
    }

    private function getBatchFilePath(string $batchId): string
    {
        return $this->getBatchDirectory($batchId) . DIRECTORY_SEPARATOR . 'preview.enc';
    }

    private function writeBatch(string $batchId, array $batch): void
    {
        File::ensureDirectoryExists($this->getBatchDirectory($batchId));
        $json = json_encode($batch, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        File::put($this->getBatchFilePath($batchId), Crypt::encryptString($json), true);
    }

    private function readBatch(string $batchId): ?array
    {
        $path = $this->getBatchFilePath($batchId);

        if (!File::exists($path)) {
            return null;
        }

        return json_decode(Crypt::decryptString(File::get($path)), true, 512, JSON_THROW_ON_ERROR);
    }

    private function readOwnedBatch(string $batchId, string $userId)
    {
        try {
            $batch = $this->readBatch($batchId);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Import batch could not be read.',
            ], 500);
        }

        if (!$batch) {
            return response()->json([
                'message' => 'Import batch not found.',
            ], 404);
        }

        if (!hash_equals((string) ($batch['created_by'] ?? ''), $userId)) {
            return response()->json([
                'message' => 'You are not allowed to access this import batch.',
            ], 403);
        }

        return $batch;
    }

    private function writeInvalidWorkbook(string $batchId, array $rows): void
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Invalid Users');

        $headers = array_merge(self::SUPPORTED_HEADERS, [
            'import_row',
            'import_status',
            'import_errors',
        ]);

        foreach ($headers as $index => $header) {
            $column = Coordinate::stringFromColumnIndex($index + 1);
            $sheet->setCellValue("{$column}1", $header);
        }

        $outputRow = 2;
        foreach ($rows as $row) {
            if (($row['status'] ?? null) !== 'INVALID') {
                continue;
            }

            $sourceData = $row['source_data'] ?? [];
            $values = [];

            foreach (self::SUPPORTED_HEADERS as $header) {
                $values[] = $sourceData[$header] ?? null;
            }

            $values[] = $row['row'] ?? null;
            $values[] = 'INVALID';
            $values[] = implode(' | ', $row['errors'] ?? []);

            foreach ($values as $index => $value) {
                $column = Coordinate::stringFromColumnIndex($index + 1);
                $sheet->setCellValue("{$column}{$outputRow}", $value);
            }

            $outputRow++;
        }

        $this->autoSizeColumns($sheet, count($headers));
        $this->addJobLevelsReferenceSheet($spreadsheet);
        $this->addDepartmentsReferenceSheet($spreadsheet);
        $this->addCompaniesReferenceSheet($spreadsheet);
        $this->addAppsReferenceSheet($spreadsheet);
        $this->addEmploymentTypeReferenceSheet($spreadsheet);

        $writer = new Xlsx($spreadsheet);
        $writer->save($this->getBatchDirectory($batchId) . DIRECTORY_SEPARATOR . 'invalid.xlsx');
    }

    // ─────────────────────────────────────────────
    // PROCESS ROW
    // ─────────────────────────────────────────────
    private function processRow(array $rowData, int $rowNumber): array
    {
        $username = $rowData['username'] ?? null;

        if (!$username) {
            return $this->failedResult($rowNumber, null, 'Username is required.');
        }

        $user = DB::connection('pilargroup')
            ->table('central_users')
            ->where('username', $username)
            ->first();

        if ($user) {
            return $this->updateExistingUser($user, $rowData, $rowNumber);
        }

        return $this->createNewUser($rowData, $rowNumber);
    }

    // ─────────────────────────────────────────────
    // CREATE NEW USER
    // ─────────────────────────────────────────────
    private function createNewUser(array $rowData, int $rowNumber): array
    {
        $errors = $this->validateCreateRow($rowData);

        if (count($errors) > 0) {
            return $this->failedResult($rowNumber, $rowData['username'] ?? null, implode(' ', $errors));
        }

        $userId = Str::uuid()->toString();
        $now = now()->toDateTimeString();

        $departments = $this->buildDepartmentsPayload(
            $this->parseList($rowData['department_ids'] ?? ''),
            $rowData['primary_department_id'] ?? null
        );

        $companies = null;

        if (!empty($rowData['company_ids'])) {
            $companies = $this->buildCompaniesPayload(
                $this->parseList($rowData['company_ids']),
                $rowData['primary_company_id'] ?? null
            );
        }

        $apps = $this->buildCreateAppSlugs($rowData);

        $isActive = array_key_exists('is_active', $rowData)
            ? $this->parseBoolean($rowData['is_active'])
            : 1;

        try {
            DB::connection('pilargroup')->transaction(function () use (
                $rowData,
                $userId,
                $now,
                $departments,
                $companies,
                $apps,
                $isActive
            ) {
                DB::connection('pilargroup')
                    ->table('central_users')
                    ->insert([
                        'id'                   => $userId,
                        'internal_id'          => $rowData['internal_id'] ?? null,
                        'username'             => $rowData['username'],
                        'password'             => Hash::make($rowData['password']),
                        'name'                 => $rowData['name'],
                        'email'                => $rowData['email'] ?? null,
                        'phone'                => $rowData['phone'] ?? null,
                        'job_position'         => $rowData['job_position'] ?? null,
                        'job_level_id'         => $rowData['job_level_id'] ?? null,
                        'employment_type_code' => $rowData['employment_type_code'] ?? null,
                        'is_active'            => $isActive,
                        'created_at'           => $now,
                        'updated_at'           => $now,
                    ]);

                $this->replaceUserDepartments($userId, $departments, $now);

                if (is_array($companies)) {
                    $this->replaceUserCompanies($userId, $companies, $now);
                } else {
                    $this->deriveAndReplaceUserCompaniesFromDepartments($userId, $departments, $now);
                }

                if (count($apps) > 0) {
                    $this->replaceUserApps($userId, $apps, $now);
                }
            });

            $this->pendingSnipeItSyncs[] = ['type' => 'sync', 'user_id' => $userId, 'old_username' => null];

            return [
                'row' => $rowNumber,
                'username' => $rowData['username'],
                'status' => 'created',
                'message' => 'User created successfully.',
            ];
        } catch (\Throwable $e) {
            return $this->failedResult($rowNumber, $rowData['username'], $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────
    // UPDATE EXISTING USER
    // ─────────────────────────────────────────────
    private function updateExistingUser($user, array $rowData, int $rowNumber): array
    {
        $errors = $this->validateUpdateRow($rowData, $user->id);

        if (count($errors) > 0) {
            return $this->failedResult($rowNumber, $rowData['username'] ?? $user->username, implode(' ', $errors));
        }

        $now = now()->toDateTimeString();
        $updates = [];

        $credentialChanged = false;
        $snipeRelevant = false;

        if (!empty($rowData['password'])) {
            $updates['password'] = Hash::make($rowData['password']);
            $credentialChanged = true;
        }

        foreach ([
            'name',
            'email',
            'phone',
            'job_position',
            'job_level_id',
            'employment_type_code',
            'internal_id',
        ] as $field) {
            if (array_key_exists($field, $rowData) && $rowData[$field] !== null && $rowData[$field] !== '') {
                $updates[$field] = $rowData[$field];

                if (in_array($field, ['name', 'email', 'job_position', 'job_level_id'], true)) {
                    $snipeRelevant = true;
                }
            }
        }

        if (array_key_exists('is_active', $rowData) && $rowData['is_active'] !== null && $rowData['is_active'] !== '') {
            $updates['is_active'] = $this->parseBoolean($rowData['is_active']);
        }

        $hasDepartmentUpdate = !empty($rowData['department_ids']);
        $hasCompanyUpdate = !empty($rowData['company_ids']);
        $hasAppsUpdate = !empty($rowData['apps']);

        if (
            count($updates) === 0
            && !$hasDepartmentUpdate
            && !$hasCompanyUpdate
            && !$hasAppsUpdate
        ) {
            return [
                'row' => $rowNumber,
                'username' => $user->username,
                'status' => 'skipped',
                'message' => 'No filled column to update.',
            ];
        }

        $departments = null;
        $companies = null;
        $apps = null;

        if ($hasDepartmentUpdate) {
            $departments = $this->buildDepartmentsPayload(
                $this->parseList($rowData['department_ids']),
                $rowData['primary_department_id'] ?? null
            );
            $snipeRelevant = true;
        }

        if ($hasCompanyUpdate) {
            $companies = $this->buildCompaniesPayload(
                $this->parseList($rowData['company_ids']),
                $rowData['primary_company_id'] ?? null
            );
        }

        if ($hasAppsUpdate) {
            $apps = $this->parseList($rowData['apps']);
        }

        try {
            DB::connection('pilargroup')->transaction(function () use (
                $user,
                $updates,
                $now,
                $departments,
                $companies,
                $apps
            ) {
                if (count($updates) > 0) {
                    $updates['updated_at'] = $now;

                    DB::connection('pilargroup')
                        ->table('central_users')
                        ->where('id', $user->id)
                        ->update($updates);
                }

                if (is_array($departments)) {
                    $this->replaceUserDepartments($user->id, $departments, $now);
                }

                if (is_array($companies)) {
                    $this->replaceUserCompanies($user->id, $companies, $now);
                }

                if (is_array($apps)) {
                    $this->replaceUserApps($user->id, $apps, $now);
                }
            });

            $updatedUser = DB::connection('pilargroup')
                ->table('central_users')
                ->where('id', $user->id)
                ->first();

            if ($credentialChanged) {
                DB::connection('pilargroup')
                    ->table('central_users')
                    ->where('id', $user->id)
                    ->increment('token_version');

                $this->pendingSnipeItSyncs[] = ['type' => 'relogin', 'username' => $updatedUser->username];
            }

            if ($snipeRelevant) {
                $this->pendingSnipeItSyncs[] = ['type' => 'sync', 'user_id' => $user->id, 'old_username' => $user->username];
            }

            return [
                'row' => $rowNumber,
                'username' => $user->username,
                'status' => 'updated',
                'message' => 'User updated successfully.',
            ];
        } catch (\Throwable $e) {
            return $this->failedResult($rowNumber, $user->username, $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────
    private function validateCreateRow(array $rowData): array
    {
        $errors = [];

        foreach (['username', 'password', 'name', 'department_ids'] as $requiredField) {
            if (empty($rowData[$requiredField])) {
                $errors[] = "{$requiredField} is required for new user.";
            }
        }

        if (!empty($rowData['username']) && strlen($rowData['username']) < 3) {
            $errors[] = 'Username minimum length is 3.';
        }

        if (!empty($rowData['password']) && strlen($rowData['password']) < 6) {
            $errors[] = 'Password minimum length is 6.';
        }

        if (!empty($rowData['email']) && !filter_var($rowData['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Email format is invalid.';
        }

        if (!empty($rowData['phone']) && strlen($rowData['phone']) > 20) {
            $errors[] = 'Phone maximum length is 20.';
        }

        if (!empty($rowData['employment_type_code']) && !in_array($rowData['employment_type_code'], self::EMPLOYMENT_TYPE_CODES, true)) {
            $errors[] = 'Employment type code must be UP, OS, or HL.';
        }

        if (!empty($rowData['job_level_id']) && !$this->existsInTable('master_job_levels', 'id', $rowData['job_level_id'])) {
            $errors[] = 'Job level ID does not exist.';
        }

        if (!empty($rowData['internal_id']) && $this->internalIdExists($rowData['internal_id'])) {
            $errors[] = 'Internal ID already exists.';
        }

        if (!empty($rowData['department_ids'])) {
            $departmentIds = $this->parseList($rowData['department_ids']);
            $errors = array_merge($errors, $this->validateDepartmentIds($departmentIds, $rowData['primary_department_id'] ?? null));
        }

        if (!empty($rowData['company_ids'])) {
            $companyIds = $this->parseList($rowData['company_ids']);
            $errors = array_merge($errors, $this->validateCompanyIds($companyIds, $rowData['primary_company_id'] ?? null));
        }

        if (!empty($rowData['apps'])) {
            $manualApps = $this->parseList($rowData['apps']);
            $errors = array_merge($errors, $this->validateAppSlugs($manualApps));
        }

        if (!empty($rowData['is_active']) && is_null($this->parseBooleanNullable($rowData['is_active']))) {
            $errors[] = 'is_active must be 1, 0, true, false, active, or inactive.';
        }

        return $errors;
    }

    private function validateUpdateRow(array $rowData, string $userId): array
    {
        $errors = [];

        if (!empty($rowData['password']) && strlen($rowData['password']) < 6) {
            $errors[] = 'Password minimum length is 6.';
        }

        if (!empty($rowData['email']) && !filter_var($rowData['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Email format is invalid.';
        }

        if (!empty($rowData['phone']) && strlen($rowData['phone']) > 20) {
            $errors[] = 'Phone maximum length is 20.';
        }

        if (!empty($rowData['employment_type_code']) && !in_array($rowData['employment_type_code'], self::EMPLOYMENT_TYPE_CODES, true)) {
            $errors[] = 'Employment type code must be UP, OS, or HL.';
        }

        if (!empty($rowData['job_level_id']) && !$this->existsInTable('master_job_levels', 'id', $rowData['job_level_id'])) {
            $errors[] = 'Job level ID does not exist.';
        }

        if (!empty($rowData['internal_id']) && $this->internalIdExists($rowData['internal_id'], $userId)) {
            $errors[] = 'Internal ID already exists.';
        }

        if (!empty($rowData['department_ids'])) {
            $departmentIds = $this->parseList($rowData['department_ids']);
            $errors = array_merge($errors, $this->validateDepartmentIds($departmentIds, $rowData['primary_department_id'] ?? null));
        }

        if (!empty($rowData['company_ids'])) {
            $companyIds = $this->parseList($rowData['company_ids']);
            $errors = array_merge($errors, $this->validateCompanyIds($companyIds, $rowData['primary_company_id'] ?? null));
        }

        if (!empty($rowData['apps'])) {
            $apps = $this->parseList($rowData['apps']);
            $errors = array_merge($errors, $this->validateAppSlugs($apps));
        }

        if (!empty($rowData['is_active']) && is_null($this->parseBooleanNullable($rowData['is_active']))) {
            $errors[] = 'is_active must be 1, 0, true, false, active, or inactive.';
        }

        return $errors;
    }

    // ─────────────────────────────────────────────
    // PIVOT REPLACERS
    // ─────────────────────────────────────────────
    private function replaceUserDepartments(string $userId, array $departments, string $now): void
    {
        DB::connection('pilargroup')
            ->table('central_user_departments')
            ->where('user_id', $userId)
            ->delete();

        foreach ($departments as $department) {
            DB::connection('pilargroup')
                ->table('central_user_departments')
                ->insert([
                    'id' => Str::uuid()->toString(),
                    'user_id' => $userId,
                    'department_id' => $department['id'],
                    'is_primary' => $department['is_primary'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
        }
    }

    private function replaceUserCompanies(string $userId, array $companies, string $now): void
    {
        DB::connection('pilargroup')
            ->table('central_user_companies')
            ->where('user_id', $userId)
            ->delete();

        foreach ($companies as $company) {
            DB::connection('pilargroup')
                ->table('central_user_companies')
                ->insert([
                    'id' => Str::uuid()->toString(),
                    'user_id' => $userId,
                    'company_id' => $company['id'],
                    'is_primary' => $company['is_primary'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
        }
    }

    private function deriveAndReplaceUserCompaniesFromDepartments(string $userId, array $departments, string $now): void
    {
        $departmentIds = collect($departments)->pluck('id')->toArray();

        $companyIds = DB::connection('pilargroup')
            ->table('master_departments')
            ->whereIn('id', $departmentIds)
            ->whereNotNull('company_id')
            ->distinct()
            ->pluck('company_id')
            ->toArray();

        $companies = collect($companyIds)
            ->map(fn ($companyId, $index) => [
                'id' => $companyId,
                'is_primary' => $index === 0 ? 1 : 0,
            ])
            ->toArray();

        $this->replaceUserCompanies($userId, $companies, $now);
    }

    private function replaceUserApps(string $userId, array $appSlugs, string $now): void
    {
        $projectIds = DB::connection('pilargroup')
            ->table('master_projects')
            ->whereIn('slug', $appSlugs)
            ->pluck('id')
            ->toArray();

        DB::connection('pilargroup')
            ->table('central_user_projects')
            ->where('user_id', $userId)
            ->delete();

        foreach ($projectIds as $projectId) {
            DB::connection('pilargroup')
                ->table('central_user_projects')
                ->insert([
                    'id' => Str::uuid()->toString(),
                    'user_id' => $userId,
                    'project_id' => $projectId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
        }
    }

    // ─────────────────────────────────────────────
    // PAYLOAD BUILDERS
    // ─────────────────────────────────────────────
    private function buildDepartmentsPayload(array $departmentIds, $primaryDepartmentId = null): array
    {
        $departmentIds = array_values(array_unique(array_map('intval', $departmentIds)));

        if (count($departmentIds) === 0) {
            return [];
        }

        $primaryDepartmentId = !empty($primaryDepartmentId)
            ? (int) $primaryDepartmentId
            : $departmentIds[0];

        if (!in_array($primaryDepartmentId, $departmentIds, true)) {
            $primaryDepartmentId = $departmentIds[0];
        }

        return collect($departmentIds)
            ->map(fn ($departmentId) => [
                'id' => $departmentId,
                'is_primary' => $departmentId === $primaryDepartmentId ? 1 : 0,
            ])
            ->toArray();
    }

    private function buildCompaniesPayload(array $companyIds, $primaryCompanyId = null): array
    {
        $companyIds = array_values(array_unique(array_map(fn ($id) => trim((string) $id), $companyIds)));

        if (count($companyIds) === 0) {
            return [];
        }

        $primaryCompanyId = !empty($primaryCompanyId)
            ? trim((string) $primaryCompanyId)
            : $companyIds[0];

        if (!in_array($primaryCompanyId, $companyIds, true)) {
            $primaryCompanyId = $companyIds[0];
        }

        return collect($companyIds)
            ->map(fn ($companyId) => [
                'id' => $companyId,
                'is_primary' => $companyId === $primaryCompanyId ? 1 : 0,
            ])
            ->toArray();
    }

    // ─────────────────────────────────────────────
    // EXCEL HELPERS
    // ─────────────────────────────────────────────
    private function getHeaderMap($sheet): array
    {
        $highestColumnIndex = Coordinate::columnIndexFromString($sheet->getHighestDataColumn());
        $headerMap = [];

        for ($columnIndex = 1; $columnIndex <= $highestColumnIndex; $columnIndex++) {
            $value = $this->getCellValue($sheet, 1, $columnIndex);
            $header = $this->normalizeHeader($value);

            if ($header) {
                $headerMap[$header] = $columnIndex;
            }
        }

        return $headerMap;
    }

    private function getRowData($sheet, array $headerMap, int $rowNumber): array
    {
        $rowData = [];

        foreach ($headerMap as $header => $columnIndex) {
            $value = $this->getCellValue($sheet, $rowNumber, $columnIndex);

            if ($value !== null && $value !== '') {
                $rowData[$header] = $value;
            }
        }

        return $rowData;
    }

    private function getCellValue($sheet, int $rowNumber, int $columnIndex)
    {
        $column = Coordinate::stringFromColumnIndex($columnIndex);
        $value = $sheet->getCell("{$column}{$rowNumber}")->getCalculatedValue();

        if (is_null($value)) {
            return null;
        }

        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    private function normalizeHeader($value): ?string
    {
        if (is_null($value)) {
            return null;
        }

        $header = strtolower(trim((string) $value));
        $header = str_replace([' ', '-'], '_', $header);

        return $header === '' ? null : $header;
    }

    private function parseList($value): array
    {
        if (is_null($value) || trim((string) $value) === '') {
            return [];
        }

        return collect(preg_split('/[,;]/', (string) $value))
            ->map(fn ($item) => trim($item))
            ->filter(fn ($item) => $item !== '')
            ->unique()
            ->values()
            ->toArray();
    }


    private function buildCreateAppSlugs(array $rowData): array
    {
        $manualApps = !empty($rowData['apps'])
            ? $this->parseList($rowData['apps'])
            : [];

        // Default apps are best-effort: skip any that don't exist yet in
        // master_projects instead of blocking user creation entirely.
        $existingDefaultApps = $this->filterExistingAppSlugs(self::DEFAULT_CREATE_APPS);

        return array_values(array_unique(array_merge(
            $existingDefaultApps,
            $manualApps
        )));
    }

    private function filterExistingAppSlugs(array $appSlugs): array
    {
        if (count($appSlugs) === 0) {
            return [];
        }

        return DB::connection('pilargroup')
            ->table('master_projects')
            ->whereIn('slug', $appSlugs)
            ->pluck('slug')
            ->all();
    }

    private function parseBoolean($value): int
    {
        return (int) $this->parseBooleanNullable($value);
    }

    private function parseBooleanNullable($value): ?bool
    {
        $value = strtolower(trim((string) $value));

        if (in_array($value, ['1', 'true', 'yes', 'y', 'active', 'aktif'], true)) {
            return true;
        }

        if (in_array($value, ['0', 'false', 'no', 'n', 'inactive', 'nonactive', 'nonaktif'], true)) {
            return false;
        }

        return null;
    }

    // ─────────────────────────────────────────────
    // LOOKUP / VALIDATION HELPERS
    // ─────────────────────────────────────────────
    private function existsInTable(string $table, string $column, $value): bool
    {
        return DB::connection('pilargroup')
            ->table($table)
            ->where($column, $value)
            ->exists();
    }

    private function internalIdExists($internalId, ?string $exceptUserId = null): bool
    {
        $query = DB::connection('pilargroup')
            ->table('central_users')
            ->where('internal_id', $internalId);

        if ($exceptUserId) {
            $query->where('id', '!=', $exceptUserId);
        }

        return $query->exists();
    }

    private function validateDepartmentIds(array $departmentIds, $primaryDepartmentId = null): array
    {
        $errors = [];

        if (count($departmentIds) === 0) {
            $errors[] = 'department_ids cannot be empty.';
            return $errors;
        }

        $departmentIds = array_values(array_unique(array_map('intval', $departmentIds)));

        $validCount = DB::connection('pilargroup')
            ->table('master_departments')
            ->whereIn('id', $departmentIds)
            ->count();

        if ($validCount !== count($departmentIds)) {
            $errors[] = 'One or more department IDs do not exist.';
        }

        if (!empty($primaryDepartmentId) && !in_array((int) $primaryDepartmentId, $departmentIds, true)) {
            $errors[] = 'primary_department_id must be included in department_ids.';
        }

        return $errors;
    }

    private function validateCompanyIds(array $companyIds, $primaryCompanyId = null): array
    {
        $errors = [];

        if (count($companyIds) === 0) {
            $errors[] = 'company_ids cannot be empty.';
            return $errors;
        }

        $companyIds = array_values(array_unique(array_map(fn ($id) => trim((string) $id), $companyIds)));

        $validCount = DB::connection('pilargroup')
            ->table('master_companies')
            ->whereIn('id', $companyIds)
            ->count();

        if ($validCount !== count($companyIds)) {
            $errors[] = 'One or more company IDs do not exist.';
        }

        if (!empty($primaryCompanyId) && !in_array(trim((string) $primaryCompanyId), $companyIds, true)) {
            $errors[] = 'primary_company_id must be included in company_ids.';
        }

        return $errors;
    }

    private function validateAppSlugs(array $appSlugs): array
    {
        $errors = [];

        if (count($appSlugs) === 0) {
            $errors[] = 'apps cannot be empty.';
            return $errors;
        }

        $validCount = DB::connection('pilargroup')
            ->table('master_projects')
            ->whereIn('slug', $appSlugs)
            ->count();

        if ($validCount !== count($appSlugs)) {
            $errors[] = 'One or more apps do not exist.';
        }

        return $errors;
    }

    // ─────────────────────────────────────────────
    // EXTERNAL SYNC
    // ─────────────────────────────────────────────
    private function processDeferredSnipeItSyncs(array $pendingSyncs): void
    {
        foreach ($pendingSyncs as $sync) {
            try {
                switch ($sync['type'] ?? null) {
                    case 'sync':
                        $user = DB::connection('pilargroup')
                            ->table('central_users')
                            ->where('id', $sync['user_id'])
                            ->first();

                        if ($user) {
                            $this->syncSnipeIt($user, $sync['old_username'] ?? null);
                        }
                        break;

                    case 'relogin':
                        (new SnipeItService())->forceRelogin($sync['username']);
                        break;
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('SnipeIt deferred sync failed: ' . $e->getMessage());
            }
        }
    }

    private function syncSnipeIt($user, ?string $oldUsername = null): void
    {
        $deptName = $this->getPrimaryDepartmentName($user->id);

        $jobLevelName = null;
        if ($user->job_level_id) {
            $jobLevelName = DB::connection('pilargroup')
                ->table('master_job_levels')
                ->where('id', $user->job_level_id)
                ->value('name');
        }

        (new SnipeItService())->syncUser($user, $deptName, $jobLevelName, $oldUsername);
    }

    private function getPrimaryDepartmentName(string $userId): ?string
    {
        return DB::connection('pilargroup')
            ->table('central_user_departments as cud')
            ->join('master_departments as md', 'cud.department_id', '=', 'md.id')
            ->where('cud.user_id', $userId)
            ->orderByRaw('cud.is_primary DESC')
            ->value('md.name');
    }

    private function getUserAppSlugs(string $userId): array
    {
        return DB::connection('pilargroup')
            ->table('central_user_projects as cup')
            ->join('master_projects as mp', 'cup.project_id', '=', 'mp.id')
            ->where('cup.user_id', $userId)
            ->pluck('mp.slug')
            ->toArray();
    }

    private function getUserDepartmentIds(string $userId): array
    {
        return DB::connection('pilargroup')
            ->table('central_user_departments')
            ->where('user_id', $userId)
            ->orderByRaw('is_primary DESC')
            ->pluck('department_id')
            ->map(fn ($id) => (int) $id)
            ->toArray();
    }

    private function getPrimaryDepartmentId(string $userId)
    {
        return DB::connection('pilargroup')
            ->table('central_user_departments')
            ->where('user_id', $userId)
            ->orderByRaw('is_primary DESC')
            ->value('department_id');
    }

    private function getUserCompanyIds(string $userId): array
    {
        return DB::connection('pilargroup')
            ->table('central_user_companies')
            ->where('user_id', $userId)
            ->orderByRaw('is_primary DESC')
            ->pluck('company_id')
            ->toArray();
    }

    private function getPrimaryCompanyId(string $userId)
    {
        return DB::connection('pilargroup')
            ->table('central_user_companies')
            ->where('user_id', $userId)
            ->orderByRaw('is_primary DESC')
            ->value('company_id');
    }

    // ─────────────────────────────────────────────
    // TEMPLATE REFERENCE SHEETS
    // ─────────────────────────────────────────────
    private function addJobLevelsReferenceSheet(Spreadsheet $spreadsheet): void
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Job Levels Reference');

        $this->writeRows($sheet, ['id', 'name', 'level'], DB::connection('pilargroup')
            ->table('master_job_levels')
            ->select('id', 'name', 'level')
            ->orderBy('level', 'desc')
            ->get()
            ->map(fn ($row) => [$row->id, $row->name, $row->level])
            ->toArray());
    }

    private function addDepartmentsReferenceSheet(Spreadsheet $spreadsheet): void
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Departments Reference');

        $this->writeRows($sheet, ['id', 'name', 'class', 'code', 'company_id', 'company_name'], DB::connection('pilargroup')
            ->table('master_departments as md')
            ->leftJoin('master_companies as mc', 'md.company_id', '=', 'mc.id')
            ->select('md.id', 'md.name', 'md.class', 'md.code', 'md.company_id', 'mc.name as company_name')
            ->orderBy('md.id')
            ->get()
            ->map(fn ($row) => [$row->id, $row->name, $row->class, $row->code, $row->company_id, $row->company_name])
            ->toArray());
    }

    private function addCompaniesReferenceSheet(Spreadsheet $spreadsheet): void
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Companies Reference');

        $this->writeRows($sheet, ['id', 'code', 'name'], DB::connection('pilargroup')
            ->table('master_companies')
            ->select('id', 'code', 'name')
            ->orderBy('name')
            ->get()
            ->map(fn ($row) => [$row->id, $row->code, $row->name])
            ->toArray());
    }

    private function addAppsReferenceSheet(Spreadsheet $spreadsheet): void
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Apps Reference');

        $this->writeRows($sheet, ['slug', 'name'], DB::connection('pilargroup')
            ->table('master_projects')
            ->select('slug', 'name')
            ->orderBy('name')
            ->get()
            ->map(fn ($row) => [$row->slug, $row->name])
            ->toArray());
    }

    private function addEmploymentTypeReferenceSheet(Spreadsheet $spreadsheet): void
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Employment Type Reference');

        $this->writeRows($sheet, ['code', 'label'], [
            ['UP', 'Under Pilar'],
            ['OS', 'Outsourced'],
            ['HL', 'Harian Lepas'],
        ]);
    }

    private function writeRows($sheet, array $headers, array $rows): void
    {
        foreach ($headers as $index => $header) {
            $column = Coordinate::stringFromColumnIndex($index + 1);
            $sheet->setCellValue("{$column}1", $header);
        }

        foreach ($rows as $rowIndex => $row) {
            foreach ($row as $columnIndex => $value) {
                $column = Coordinate::stringFromColumnIndex($columnIndex + 1);
                $sheet->setCellValue($column . ($rowIndex + 2), $value);
            }
        }

        $this->autoSizeColumns($sheet, count($headers));
    }

    private function autoSizeColumns($sheet, int $columnCount): void
    {
        for ($columnIndex = 1; $columnIndex <= $columnCount; $columnIndex++) {
            $column = Coordinate::stringFromColumnIndex($columnIndex);
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $sheet->freezePane('A2');
    }

    // ─────────────────────────────────────────────
    // RESULT HELPERS
    // ─────────────────────────────────────────────
    private function failedResult(int $rowNumber, ?string $username, string $message): array
    {
        return [
            'row' => $rowNumber,
            'username' => $username,
            'status' => 'failed',
            'message' => $message,
        ];
    }

    public function export()
    {
        try {
            $spreadsheet = new Spreadsheet();

            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Users');

            $headers = self::SUPPORTED_HEADERS;

            foreach ($headers as $index => $header) {
                $column = Coordinate::stringFromColumnIndex($index + 1);
                $sheet->setCellValue("{$column}1", $header);
            }

            $users = DB::connection('pilargroup')
                ->table('central_users as cu')
                ->leftJoin('master_job_levels as mjl', 'cu.job_level_id', '=', 'mjl.id')
                ->select(
                    'cu.id',
                    'cu.username',
                    'cu.name',
                    'cu.email',
                    'cu.phone',
                    'cu.job_position',
                    'cu.job_level_id',
                    'cu.employment_type_code',
                    'cu.internal_id',
                    'cu.is_active'
                )
                ->orderBy('cu.name')
                ->get();

            $rowNumber = 2;

            foreach ($users as $user) {
                $departmentIds = $this->getUserDepartmentIds($user->id);
                $primaryDepartmentId = $this->getPrimaryDepartmentId($user->id);

                $companyIds = $this->getUserCompanyIds($user->id);
                $primaryCompanyId = $this->getPrimaryCompanyId($user->id);

                $apps = $this->getUserAppSlugs($user->id);

                $row = [
                    $user->username,
                    '', // password intentionally blank
                    $user->name,
                    $user->email,
                    $user->phone,
                    $user->job_position,
                    $user->job_level_id,
                    $user->employment_type_code,
                    $user->internal_id,
                    implode(',', $departmentIds),
                    $primaryDepartmentId,
                    implode(',', $companyIds),
                    $primaryCompanyId,
                    implode(',', $apps),
                    $user->is_active,
                ];

                foreach ($row as $index => $value) {
                    $column = Coordinate::stringFromColumnIndex($index + 1);
                    $sheet->setCellValue("{$column}{$rowNumber}", $value);
                }

                $rowNumber++;
            }

            $this->autoSizeColumns($sheet, count($headers));

            $this->addJobLevelsReferenceSheet($spreadsheet);
            $this->addDepartmentsReferenceSheet($spreadsheet);
            $this->addCompaniesReferenceSheet($spreadsheet);
            $this->addAppsReferenceSheet($spreadsheet);
            $this->addEmploymentTypeReferenceSheet($spreadsheet);

            $fileName = 'users_export_' . now()->format('Ymd_His') . '.xlsx';
            $filePath = storage_path("app/{$fileName}");

            $writer = new Xlsx($spreadsheet);
            $writer->save($filePath);

            return response()->download($filePath, $fileName)->deleteFileAfterSend(true);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error while exporting users',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}