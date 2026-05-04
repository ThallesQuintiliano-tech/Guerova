<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MetaAdsConnection extends Model
{
    protected $fillable = [
        'account_id',
        'created_by_user_id',
        'graph_version',
        'ad_account_id',
        'page_id',
        'ig_user_id',
        'pixel_id',
        'access_token',
    ];

    protected $hidden = ['access_token'];

    protected $casts = [
        'access_token' => 'encrypted',
    ];

    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}

