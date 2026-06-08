<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DispatchProduct extends Model
{
    use HasFactory;

    protected $fillable = [
        'dispatch_id',
        'product_name',
        'quantity',
        'delivered',
    ];

    protected $casts = [
        'delivered' => 'boolean',
    ];

    public function dispatch(): BelongsTo
    {
        return $this->belongsTo(Dispatch::class);
    }
}
