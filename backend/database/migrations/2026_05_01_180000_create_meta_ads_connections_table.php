<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meta_ads_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('accounts')->cascadeOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('graph_version')->nullable();
            $table->string('ad_account_id')->nullable();
            $table->string('page_id')->nullable();
            $table->string('ig_user_id')->nullable();
            $table->string('pixel_id')->nullable();
            $table->text('access_token');
            $table->timestamps();

            $table->unique(['account_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meta_ads_connections');
    }
};

