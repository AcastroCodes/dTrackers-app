<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * - Agrega company_id (nullable) a la tabla users.
     * - Elimina user_id de la tabla companies.
     */
    public function up(): void
    {
        // 1. Agregar company_id a users
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('company_id')
                ->nullable()
                ->after('role')
                ->constrained()
                ->nullOnDelete();
        });

        // 2. Eliminar la FK y columna user_id de companies
        Schema::table('companies', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revertir: quitar company_id de users
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropColumn('company_id');
        });

        // Revertir: agregar user_id de vuelta a companies
        Schema::table('companies', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
        });
    }
};
