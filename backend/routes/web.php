<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SamlController;
use App\Http\Controllers\SSOController;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/saml/metadata', [SamlController::class, 'metadata']);
Route::get('/saml/sso', [SamlController::class, 'sso']);
Route::post('/saml/sso', [SamlController::class, 'sso']);
Route::get('/saml/slo', [SamlController::class, 'slo']);
Route::post('/saml/slo', [SamlController::class, 'slo']);
