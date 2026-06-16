<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Route extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'truck_id',
        'user_id',
        'date',
        'status',
        'total_distance_km',
        'estimated_time_mins',
        'estimated_fuel_liters',
        'started_at',
    ];

    protected $casts = [
        'company_id' => 'integer',
        'truck_id' => 'integer',
        'user_id' => 'integer',
        'started_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function truck(): BelongsTo
    {
        return $this->belongsTo(Truck::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function dispatches(): HasMany
    {
        return $this->hasMany(Dispatch::class)->orderBy('order_index');
    }
}
