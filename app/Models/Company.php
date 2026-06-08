<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'logo',
        'tax_id',
        'address',
        'phone',
        'latitude',
        'longitude',
    ];

    /**
     * Get the users that belong to this company.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get the trucks that belong to this company.
     */
    public function trucks(): HasMany
    {
        return $this->hasMany(Truck::class);
    }

    /**
     * Get the clients that belong to this company.
     */
    public function clients(): HasMany
    {
        return $this->hasMany(Client::class);
    }
}
