<?php

namespace App\Console\Commands;

use App\Models\Account;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class GuerovaCreateAdmin extends Command
{
    protected $signature = 'guerova:create-admin
        {--email= : Email do admin}
        {--password= : Password do admin}
        {--name= : Nome do admin}
        {--account= : Nome da conta (opcional)}
        {--system : Torna admin global do sistema}';

    protected $description = 'Cria um usuário admin (global e/ou de uma conta)';

    public function handle(): int
    {
        $email = (string) ($this->option('email') ?: $this->ask('Email'));
        $password = (string) ($this->option('password') ?: $this->secret('Password'));
        $name = (string) ($this->option('name') ?: $this->ask('Nome', 'Admin'));
        $accountName = (string) ($this->option('account') ?: '');
        $system = (bool) $this->option('system');

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Email inválido.');

            return self::FAILURE;
        }
        if (strlen($password) < 6) {
            $this->error('Password muito curta (mínimo 6).');

            return self::FAILURE;
        }

        /** @var User $user */
        $user = User::query()->firstOrCreate(
            ['email' => $email],
            ['name' => $name, 'password' => $password],
        );

        if ($user->name !== $name) {
            $user->name = $name;
        }
        if ($system) {
            $user->is_system_admin = true;
        }
        $user->password = $password;
        $user->save();

        if (trim($accountName) !== '') {
            $slug = Str::slug($accountName);
            /** @var Account $account */
            $account = Account::query()->firstOrCreate(
                ['slug' => $slug],
                ['name' => $accountName, 'slug' => $slug],
            );

            $account->users()->syncWithoutDetaching([
                $user->id => ['role' => 'account_admin'],
            ]);
        }

        $this->info('OK: usuário criado/atualizado.');
        $this->line('Email: '.$user->email);
        $this->line('System admin: '.($user->is_system_admin ? 'yes' : 'no'));

        if (trim($accountName) !== '') {
            $this->line('Conta: '.$accountName.' (role: account_admin)');
        }

        return self::SUCCESS;
    }
}
