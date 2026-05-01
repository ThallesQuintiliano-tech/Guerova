<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class WhatsAppEnvCheck extends Command
{
    protected $signature = 'whatsapp:env-check';

    protected $description = 'Mostra se WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID estão preenchidos (sem revelar o token)';

    public function handle(): int
    {
        $token = trim((string) config('whatsapp.access_token'));
        $phoneId = trim((string) config('whatsapp.phone_number_id'));

        $this->newLine();
        $this->components->twoColumnDetail(
            'WHATSAPP_ACCESS_TOKEN',
            $token === '' ? 'VAZIO — precisa do token na Meta (WhatsApp → API Setup)' : 'OK ('.strlen($token).' caracteres)'
        );
        $this->components->twoColumnDetail(
            'WHATSAPP_PHONE_NUMBER_ID',
            $phoneId === '' ? 'VAZIO — precisa do ID na mesma página da Meta' : 'OK ('.$phoneId.')'
        );
        $this->components->twoColumnDetail(
            'WHATSAPP_APP_SECRET',
            trim((string) config('whatsapp.app_secret')) === '' ? 'vazio' : 'OK (definido)'
        );
        $this->components->twoColumnDetail(
            'WHATSAPP_BRIDGE_SECRET',
            trim((string) config('whatsapp.bridge_secret')) === '' ? 'vazio' : 'OK (definido)'
        );
        $this->newLine();

        if ($token === '' || $phoneId === '') {
            $this->warn('Enquanto TOKEN ou PHONE_NUMBER_ID estiver vazio, o envio no Guerova devolve erro.');
            $this->line('Guia: developers.facebook.com → a tua app → WhatsApp → secção de início da API (token + Phone number ID).');
            $this->newLine();

            return self::FAILURE;
        }

        $this->info('Credenciais mínimas para envio estão presentes. Teste o botão Enviar no frontend.');

        return self::SUCCESS;
    }
}
