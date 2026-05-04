<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('businesses')) {
            // Fresh installs may not have the legacy `businesses` table.
            return;
        }

        if (! Schema::hasColumn('businesses', 'client_id')) {
            return;
        }

        $hasDuplicates = DB::table('businesses')
            ->select('client_id')
            ->whereNotNull('client_id')
            ->groupBy('client_id')
            ->havingRaw('COUNT(*) > 1')
            ->limit(1)
            ->exists();

        if ($hasDuplicates) {
            throw new RuntimeException(
                "Não foi possível criar UNIQUE(businesses.client_id): existem client_id duplicados na tabela businesses."
            );
        }

        Schema::table('businesses', function (Blueprint $table) {
            $table->unique('client_id', 'businesses_client_id_unique');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('businesses')) {
            return;
        }

        Schema::table('businesses', function (Blueprint $table) {
            $table->dropUnique('businesses_client_id_unique');
        });
    }
};

