<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\User::create([
            'name' => 'Aristides Castro',
            'email' => 'aristidesantoniocastro@gmail.com',
            'password' => \Illuminate\Support\Facades\Hash::make('2747'),
            'email_verified_at' => now(),
            'role' => 'superadmin',
        ]);
    }
}
