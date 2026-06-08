<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Dispatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'route_id',
        'client_id',
        'order_index',
        'status',
        'dispatched_at',
        'observation',
    ];

    protected $casts = [
        'dispatched_at' => 'datetime',
    ];

    public function route(): BelongsTo
    {
        return $this->belongsTo(Route::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(DispatchProduct::class);
    }
}
