<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meta_ads_connections', function (Blueprint $table) {
            $table->timestamp('access_token_expires_at')->nullable()->after('access_token');
        });
    }

    public function down(): void
    {
        Schema::table('meta_ads_connections', function (Blueprint $table) {
            $table->dropColumn('access_token_expires_at');
        });
    }
};
