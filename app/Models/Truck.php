<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Truck extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'license_plate',
        'model',
        'description',
    ];

    protected $casts = [
        'company_id' => 'integer',
    ];

    /**
     * Get the company that owns the truck.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function routes(): HasMany
    {
        return $this->hasMany(Route::class);
    }
}
