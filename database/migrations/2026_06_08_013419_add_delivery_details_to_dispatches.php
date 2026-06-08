<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('dispatches', function (Blueprint $table) {
            $table->text('observation')->nullable();
        });

        Schema::table('dispatch_products', function (Blueprint $table) {
            $table->boolean('delivered')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dispatch_products', function (Blueprint $table) {
            $table->dropColumn('delivered');
        });

        Schema::table('dispatches', function (Blueprint $table) {
            $table->dropColumn('observation');
        });
    }
};
