<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoogleAdsConnection extends Model
{
    protected $fillable = [
        'account_id',
        'created_by_user_id',
        'customer_id',
        'refresh_token',
        'scopes',
        'connected_email',
    ];

    protected $hidden = ['refresh_token'];

    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
