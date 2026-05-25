<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\MetaAdsConnection;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $user = User::query()->updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $account = Account::query()->firstOrCreate(
            ['slug' => 'default'],
            ['name' => 'Conta padrão']
        );

        if (! $user->accounts()->where('accounts.id', $account->id)->exists()) {
            $user->accounts()->attach($account->id, ['role' => 'account_admin']);
        }

        // Utilizadores já existentes na BD sem workspace (ex.: seed antigo) passam a ter a conta padrão.
        User::query()
            ->whereDoesntHave('accounts')
            ->each(function (User $orphan) use ($account): void {
                $orphan->accounts()->attach($account->id, ['role' => 'account_admin']);
            });

        $metaToken = trim((string) env('META_ADS_ACCESS_TOKEN', ''));
        if (strlen($metaToken) >= 20) {
            MetaAdsConnection::query()->updateOrCreate(
                ['account_id' => $account->id],
                [
                    'created_by_user_id' => $user->id,
                    'access_token' => $metaToken,
                    'graph_version' => (string) config('meta_ads.graph_version', 'v21.0'),
                    'ad_account_id' => trim((string) env('META_ADS_AD_ACCOUNT_ID', '')) ?: null,
                ]
            );
        }
    }
}
