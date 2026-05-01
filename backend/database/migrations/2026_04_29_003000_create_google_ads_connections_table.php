<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('google_ads_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('accounts')->cascadeOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('customer_id')->nullable();
            $table->text('refresh_token');
            $table->text('scopes')->nullable();
            $table->string('connected_email')->nullable();
            $table->timestamps();

            $table->unique(['account_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('google_ads_connections');
    }
};
