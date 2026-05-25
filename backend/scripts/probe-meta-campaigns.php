<?php

declare(strict_types=1);

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\MetaAdsConnection;
use App\Services\MetaAdsClient;
use App\Services\MetaAdsTokenService;

$version = (string) config('meta_ads.graph_version', 'v21.0');
$envToken = trim((string) env('META_ADS_ACCESS_TOKEN', ''));
$envAct = trim((string) env('META_ADS_AD_ACCOUNT_ID', ''));

echo 'META_APP_ID (.env): '.(string) config('meta_ads.app_id')."\n";
echo 'Ad account configurada (.env): '.$envAct."\n\n";

$apps = [
    'Guerova' => '952751837562238',
    'Software' => '2456109771508463',
    'Guerova - Test1' => '1543290790688164',
    'Software - Test1' => '1891224841506128',
    'Antigo (inativo)' => '957740740376831',
];
echo "Apps Meta (campanhas ficam nas *contas de anuncios*, nao no app):\n";
foreach ($apps as $name => $id) {
    echo "  - {$name}: {$id}\n";
}
echo "\n";

$tokens = [];
if ($envToken !== '') {
    $tokens['Token .env (META_ADS_ACCESS_TOKEN)'] = $envToken;
}
foreach (MetaAdsConnection::query()->get() as $conn) {
    $tokens['Token DB (workspace account_id='.$conn->account_id.')'] = (string) $conn->access_token;
}

if ($tokens === []) {
    echo "Nenhum token encontrado (.env nem meta_ads_connections).\n";
    exit(1);
}

foreach ($tokens as $label => $token) {
    echo "=== {$label} ===\n";
    $info = MetaAdsTokenService::inspect($token);
    echo 'Token valido: '.($info['is_valid'] ? 'sim' : 'nao')."\n";
    if (! empty($info['error'])) {
        echo 'Detalhe: '.$info['error']."\n";
    }
    if ($info['expires_at'] !== null) {
        echo 'Expira em: '.$info['expires_at']->toDateTimeString()."\n";
    }
    if (! $info['is_valid']) {
        echo "\n";
        continue;
    }

    try {
        $client = new MetaAdsClient($token, $version);
        $me = $client->get('/me', ['fields' => 'id,name']);
        echo 'Utilizador Facebook: '.($me['name'] ?? '?').' (id '.($me['id'] ?? '?').")\n";

        $resp = $client->get('/me/adaccounts', [
            'fields' => 'id,name,account_id,account_status',
            'limit' => 100,
        ]);
        $acts = is_array($resp['data'] ?? null) ? $resp['data'] : [];
        echo 'Contas de anuncios acessiveis: '.count($acts)."\n";

        if ($envAct !== '') {
            $highlight = str_starts_with($envAct, 'act_') ? $envAct : 'act_'.$envAct;
            echo "(Conta no .env: {$highlight})\n";
        }

        foreach ($acts as $a) {
            if (! is_array($a)) {
                continue;
            }
            $actId = (string) ($a['id'] ?? '');
            $name = (string) ($a['name'] ?? '');
            $st = (string) ($a['account_status'] ?? '');
            $numeric = (string) ($a['account_id'] ?? '');
            try {
                $camps = $client->get('/'.$actId.'/campaigns', [
                    'fields' => 'id,name,status',
                    'limit' => 3,
                    'summary' => 'total_count',
                ]);
                $total = (int) ($camps['summary']['total_count'] ?? count($camps['data'] ?? []));
                $marker = ($envAct !== '' && ($actId === $envAct || $actId === 'act_'.$envAct || 'act_'.$numeric === $envAct)) ? ' <-- configurada no .env' : '';
                echo "  * {$actId} | {$name} | status={$st} | campanhas={$total}{$marker}\n";
                if ($total > 0 && is_array($camps['data'] ?? null)) {
                    foreach (array_slice($camps['data'], 0, 3) as $c) {
                        if (! is_array($c)) {
                            continue;
                        }
                        echo '      - '.($c['name'] ?? '?').' ['.($c['status'] ?? '?').'] id='.($c['id'] ?? '?')."\n";
                    }
                }
            } catch (Throwable $e) {
                echo "  * {$actId} | {$name} | erro ao listar campanhas: ".$e->getMessage()."\n";
            }
        }
    } catch (Throwable $e) {
        echo 'Erro API: '.$e->getMessage()."\n";
    }
    echo "\n";
}

echo "Fim.\n";
