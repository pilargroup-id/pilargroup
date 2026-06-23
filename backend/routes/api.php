<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\MasterController;
use App\Http\Controllers\BusinessUnitController;
use App\Http\Controllers\SamlController;
use App\Http\Controllers\SSOController;
use App\Http\Controllers\Internal\DirectoryController;
use App\Http\Controllers\UserImportController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/auth/login', [AuthController::class, 'login']);

Route::prefix('auth')
    ->middleware('auth.central')
    ->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::get('/status', [AuthController::class, 'status']);
        Route::put('/change-profile', [ProfileController::class, 'changeProfile']);
    });

Route::prefix('users')
    ->middleware('auth.central')
    ->group(function () {
        // User import - IT only
        Route::middleware('it.only')->group(function () {
            Route::get('/import-template', [UserImportController::class, 'downloadTemplate']);
            Route::post('/import', [UserImportController::class, 'import']);
        });

        // User management - IT full access, HCGA limited access
        Route::middleware('user.management.access')->group(function () {
            Route::get('/', [UserManagementController::class, 'index']);
            Route::post('/', [UserManagementController::class, 'store']);
            Route::patch('/{id}/status', [UserManagementController::class, 'updateStatus']);
            Route::get('/{id}', [UserManagementController::class, 'show']);
            Route::put('/{id}', [UserManagementController::class, 'update']);
        });

        // Delete user - IT only
        Route::delete('/{id}', [UserManagementController::class, 'destroy'])
            ->middleware('it.only');
    });

Route::prefix('master')
    ->middleware('auth.central')
    ->group(function () {
        Route::get('/departments', [MasterController::class, 'getDepartments']);
        Route::get('/projects', [MasterController::class, 'getProjects']);

        // Needed by User Management form.
        // Accessible by IT and HCGA.
        Route::get('/job-levels', [MasterController::class, 'getJobLevels'])
            ->middleware('user.management.access');

        // CRUD master - IT only
        Route::middleware('it.only')->group(function () {
            Route::post('/departments', [MasterController::class, 'storeDepartment']);
            Route::put('/departments/{id}', [MasterController::class, 'updateDepartment']);
            Route::delete('/departments/{id}', [MasterController::class, 'deleteDepartment']);

            Route::post('/projects', [MasterController::class, 'storeProject']);
            Route::put('/projects/{id}', [MasterController::class, 'updateProject']);
            Route::delete('/projects/{id}', [MasterController::class, 'deleteProject']);

            Route::post('/job-levels', [MasterController::class, 'storeJobLevel']);
            Route::put('/job-levels/{id}', [MasterController::class, 'updateJobLevel']);
            Route::delete('/job-levels/{id}', [MasterController::class, 'destroyJobLevel']);

            Route::get('/business-units', [BusinessUnitController::class, 'index']);
            Route::post('/business-units', [BusinessUnitController::class, 'store']);
            Route::get('/business-units/{id}', [BusinessUnitController::class, 'show']);
            Route::put('/business-units/{id}', [BusinessUnitController::class, 'update']);
            Route::patch('/business-units/{id}/status', [BusinessUnitController::class, 'updateStatus']);
            Route::delete('/business-units/{id}', [BusinessUnitController::class, 'destroy']);
        });
    });

Route::middleware(\App\Http\Middleware\AuthMiddleware::class)
    ->post('/saml/respond', function (\Illuminate\Http\Request $request) {
        $request->validate(['saml_token' => 'required|uuid']);

        // user_id sudah di-inject oleh AuthMiddleware
        $userId = $request->user_id;

        return app(\App\Http\Controllers\SamlController::class)
            ->sendResponse($userId, $request->saml_token);
    });

Route::prefix('internal')
    ->middleware('internal.sync')
    ->group(function () {
        Route::get('/directory/users', [DirectoryController::class, 'users']);
        Route::get('/directory/departments', [DirectoryController::class, 'departments']);
        Route::get('/directory/business-units', [DirectoryController::class, 'businessUnits']);
        Route::get('/directory/business-units/{id}/departments', [DirectoryController::class, 'businessUnitDepartments']);
    });

Route::get('/sso/authorize', [SSOController::class, 'authorize'])
    ->middleware('auth.central')
    ->name('sso.authorize');

Route::post('/sso/verify', [SSOController::class, 'verify']);