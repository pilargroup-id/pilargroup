<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\MasterController;
use App\Http\Controllers\SamlController;
use App\Http\Controllers\SSOController;


Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/auth/login', [AuthController::class, 'login']);

Route::prefix('auth')
    ->middleware('auth.central')
    ->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/change-profile', [ProfileController::class, 'changeProfile']);
    });

Route::prefix('users')
    ->middleware(['auth.central', 'it.only'])
    ->group(function () {
        Route::get('/', [UserManagementController::class, 'index']);
        Route::post('/', [UserManagementController::class, 'store']);
        Route::get('/{id}', [UserManagementController::class, 'show']);
        Route::put('/{id}', [UserManagementController::class, 'update']);
        Route::delete('/{id}', [UserManagementController::class, 'destroy']);
    });

Route::prefix('master')
    ->middleware('auth.central')
    ->group(function () {

        Route::get('/departments', [MasterController::class, 'getDepartments']);
        Route::get('/projects', [MasterController::class, 'getProjects']);

        // CRUD master - IT only
        Route::middleware('it.only')->group(function () {
            Route::post('/departments', [MasterController::class, 'storeDepartment']);
            Route::put('/departments/{id}', [MasterController::class, 'updateDepartment']);
            Route::delete('/departments/{id}', [MasterController::class, 'deleteDepartment']);

            Route::post('/projects', [MasterController::class, 'storeProject']);
            Route::put('/projects/{id}', [MasterController::class, 'updateProject']);
            Route::delete('/projects/{id}', [MasterController::class, 'deleteProject']);
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

Route::get('/sso/authorize', [SSOController::class, 'authorize'])
    ->middleware('auth.central')
    ->name('sso.authorize');

Route::post('/sso/verify', [SSOController::class, 'verify']);