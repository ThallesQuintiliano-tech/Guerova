<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GoogleAdsApiController;
use App\Http\Controllers\GoogleAdsOAuthController;
use App\Http\Controllers\ScrapingController;
use App\Http\Controllers\SerasaDecryptController;
use App\Http\Controllers\SerasaScoreController;
use App\Http\Controllers\WhatsAppController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'ok' => true,
        'service' => 'laravel',
        'time' => now()->toIso8601String(),
    ]);
})->name('health');

Route::get('/whatsapp/status', [WhatsAppController::class, 'status'])->name('whatsapp.status');

Route::get('/whatsapp/webhook', [WhatsAppController::class, 'verify'])->name('whatsapp.webhook.verify');
Route::post('/whatsapp/webhook', [WhatsAppController::class, 'webhook'])->name('whatsapp.webhook');

Route::middleware(['whatsapp.bridge', 'throttle:30,1'])->group(function (): void {
    Route::post('/whatsapp/send', [WhatsAppController::class, 'send'])->name('whatsapp.send');
});

Route::middleware(['throttle:10,1'])->group(function (): void {
    Route::post('/auth/login', [AuthController::class, 'login'])->name('auth.login');
    Route::post('/scraping/run', [ScrapingController::class, 'run'])->name('scraping.run');
});

Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function (): void {
    Route::get('/auth/me', [AuthController::class, 'me'])->name('auth.me');
    Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');

    Route::get('/accounts', [AccountController::class, 'myAccounts'])->name('accounts.mine');

    Route::middleware(['system.admin'])->group(function (): void {
        Route::get('/admin/accounts', [AccountController::class, 'adminList'])->name('admin.accounts.list');
        Route::post('/admin/accounts', [AccountController::class, 'adminCreate'])->name('admin.accounts.create');
        Route::get('/admin/users', [AdminUserController::class, 'index'])->name('admin.users.list');
        Route::post('/admin/users', [AdminUserController::class, 'store'])->name('admin.users.create');
        Route::post('/admin/score/people', [SerasaScoreController::class, 'people'])->name('admin.score.people');
        Route::post('/admin/serasa/decrypt-document', [SerasaDecryptController::class, 'document'])->name('admin.serasa.decrypt_document');
    });
});

// Google Ads (por conta): OAuth + chamadas à API
Route::middleware(['auth:sanctum', 'account.resolve', 'throttle:30,1'])->group(function (): void {
    Route::get('/google-ads/oauth/authorize-url', [GoogleAdsOAuthController::class, 'authorizeUrl'])->name('googleAds.oauth.authorizeUrl');
    Route::get('/google-ads/oauth/start', [GoogleAdsOAuthController::class, 'start'])->name('googleAds.oauth.start');
    Route::get('/google-ads/connection', [GoogleAdsApiController::class, 'connection'])->name('googleAds.connection');
    Route::get('/google-ads/accessible-customers', [GoogleAdsApiController::class, 'accessibleCustomers'])->name('googleAds.accessibleCustomers');
    Route::get('/google-ads/campaigns', [GoogleAdsApiController::class, 'campaigns'])->name('googleAds.campaigns');
    Route::get('/google-ads/search', [GoogleAdsApiController::class, 'search'])->name('googleAds.search');
});

// Callback (sem auth; valida pelo state cache)
Route::get('/google-ads/oauth/callback', [GoogleAdsOAuthController::class, 'callback'])->name('googleAds.oauth.callback');
