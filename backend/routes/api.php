<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('auth.central');
Route::get('/auth/me', [AuthController::class, 'me'])->middleware('auth.central');
Route::put('/auth/change-profile', [ProfileController::class, 'changeProfile'])->middleware('auth.central');