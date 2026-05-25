# Guerova (Laravel API + React)

Estrutura:

- `backend/`: Laravel (API)
- `frontend/`: **ArchitectUI React** (Vite) — base pública [architectui-react-theme-free](https://github.com/DashboardPack/architectui-react-theme-free), com proxy `/api` para o Laravel. O app comercial em [react.architectui.com](https://react.architectui.com/) (PRO) pode substituir este `frontend/` mantendo o `vite.config.js` (porta + proxy).
- `frontend-legacy-vite/`: scaffold Vite mínimo anterior (backup).

## Pré-requisitos (Windows)

- Docker Desktop **rodando** (Engine Linux / `desktop-linux`)
- Node.js **>= 22.12** (e npm >= 10 recomendado)

- Se o Docker não responder, abra o **Docker Desktop** até o engine ficar ativo.
- Se existir **Node 16** no PATH à frente do Node 22+, use `npm install --legacy-peer-deps` ou invoque o `npm` com Node 22+ (veja `engines` e `.nvmrc` em `frontend/`).

## macOS / Linux (backend local, sem Docker)

- **Node.js ≥ 22** (recomendado: igual ao `frontend/.nvmrc`)
- **PHP 8.2+** com extensões usuais do Laravel + Composer
- Na pasta `backend/`: copiar `.env.example` para `.env` se ainda não existir, `composer install`, `php artisan key:generate` se necessário, criar `database/database.sqlite` se usar SQLite, `php artisan migrate`
- Subir API:

```bash
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

- Subir Vite (dev, com proxy `/api` → Laravel):

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

- Depois de `npm run build`, o **`npm run preview`** usa a porta **4173** (ou `VITE_PREVIEW_PORT`) e o **mesmo proxy `/api`** que em dev.

- Alternativa só com ficheiros estáticos em `frontend/build/`: `node scripts/dev-spa-proxy.mjs` (serve em `5173` e encaminha `/api` para o Laravel).

## Subir o backend (Laravel) via Docker

1. Inicie o Docker Desktop
2. Rode o script abaixo no PowerShell:

```powershell
cd c:\Projetos\Guerova
.\scripts\create-backend.ps1
```

Depois disso, o Laravel deve ficar em `http://localhost:8000` e a rota `GET /api/health` deve responder JSON.

## Subir o frontend (React)

```powershell
cd c:\Projetos\Guerova\frontend
npm install --legacy-peer-deps
npm run dev
```

O Vite usa `VITE_PORT` (padrão **5173** no `.env`) e faz **proxy** de `/api/*` para `VITE_API_PROXY_TARGET` (padrão `http://127.0.0.1:8000`).

## Template PRO (react.architectui.com)

O site [react.architectui.com](https://react.architectui.com/) é o produto **PRO** (ZIP / repositório privado após compra). Depois de baixar o pacote, substitua o conteúdo de `frontend/` pelo do PRO e **reaplique** no `vite.config.*`: `server` e `preview` (porta, `strictPort`, `proxy['/api']`) e `VITE_API_PROXY_TARGET`, para continuar integrado ao Laravel.

## WhatsApp

### WhatsApp Web (QR Code — como web.whatsapp.com)

Conexão pelo telemóvel, sem token da Meta:

1. No `backend/.env`: `WHATSAPP_WEB_BRIDGE_URL=http://127.0.0.1:3100` (e opcionalmente o mesmo `WHATSAPP_BRIDGE_SECRET` usado no envio).
2. Na pasta `whatsapp-bridge/`: `npm install` e `npm start` (porta 3100).
3. No painel **Lead Master → WhatsApp**, clique em **Mostrar QR Code** e leia o código em **Aparelhos conectados** no app.

O serviço guarda a sessão em `whatsapp-bridge/auth_data/` (não versionar). Em produção, execute o bridge como processo persistente (systemd, PM2, etc.) e restrinja a porta 3100 ao localhost.

**Aviso:** APIs não oficiais do WhatsApp Web podem violar os Termos de Serviço da Meta; use por sua conta e risco. Para uso comercial oficial, prefira a Cloud API abaixo.

### Cloud API (Meta) — opcional

Integração oficial via [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api). Precisas de conta **Meta for Developers**, produto **WhatsApp** no app, número **WhatsApp Business** e token com permissões de mensagens.

### Variáveis no `backend/.env`

Copia do `backend/.env.example`: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_BRIDGE_SECRET` (segredo **teu** para o painel Guerova chamar o envio — **não** é o token da Meta).

Para ver **sem expor o token** se o Laravel está a ler o `.env`:

```bash
cd backend
php artisan whatsapp:env-check
```

### Webhook (receber mensagens)

1. URL de callback (produção HTTPS ou túnel tipo **ngrok** em dev):  
   `https://SEU_DOMINIO/api/whatsapp/webhook`
2. Token de verificação: o mesmo valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
3. O Meta envia `GET` com `hub.*` para validar; o `POST` com assinatura `X-Hub-Signature-256` (validado com `WHATSAPP_APP_SECRET`). Payloads ficam registados em log (`storage/logs`).

### Enviar texto (teste)

`POST /api/whatsapp/send` com cabeçalho `X-Guerova-Secret: <WHATSAPP_BRIDGE_SECRET>` e JSON:

```json
{ "to": "5511999999999", "message": "Olá pelo Guerova" }
```

`to` = apenas dígitos com código do país (sem `+`). A primeira mensagem a um contacto novo pode exigir [modelo aprovado](https://developers.facebook.com/docs/whatsapp/message-templates) conforme política da Meta.

O ecrã **Lead Master → WhatsApp** mostra o estado da API e um formulário de teste quando o backend está a correr.

Para **pré-preencher o número de destino** no formulário (só na tua máquina), cria `frontend/.env.local` com `VITE_WHATSAPP_DEFAULT_RECIPIENT=5511…` (ficheiro ignorado pelo Git). Reinicia o `npm run dev` depois de alterar.

## Meta Ads (Marketing API — Lead Master)

O token que usas em **Configurações → Meta Ads** tem de ser um **token de utilizador** (ou de sistema no Business Manager) com permissões de **anúncios** na **mesma** app do Developers. O `WHATSAPP_ACCESS_TOKEN` do `.env` **não** substitui isto: o WhatsApp Cloud API usa outro conjunto de scopes e a Meta devolve `403 (#200) Missing Permissions` em `/me/adaccounts` se colares esse token aqui.

### Obter um token que funcione

1. [developers.facebook.com](https://developers.facebook.com/) → a tua **app** (a que vais usar para Ads).
2. Garante **função** na app: o teu utilizador Facebook como **Administrador**, **Programador** ou **Tester** (em modo desenvolvimento, só estes utilizadores recebem permissões avançadas sem passar revisão da app).
3. Em **Casos de utilização** / **Facebook Login** (ou ferramentas de permissões da app), adiciona **`ads_read`** (listar campanhas) ou **`ads_management`** (criar/editar). Em produção, `ads_read` costuma exigir **acesso avançado** após [revisão da app](https://developers.facebook.com/docs/app-review); em desenvolvimento basta o papel na app acima.
4. Abre o [Graph API Explorer](https://developers.facebook.com/tools/explorer/): no canto superior, escolhe **a mesma app**; em **Permissões do Token de Acesso**, adiciona `ads_read` (e `ads_management` se precisares); clica **Gerar token de acesso** e inicia sessão com o utilizador que tem acesso à **conta de anúncios** no Business Manager.
5. Cola esse token em **Lead Master → Configurações → Meta Ads** e indica o **Ad Account ID** (`act_…`).

### Opcional no `backend/.env`

- `META_APP_ID` e `META_APP_SECRET` (Definições → **Básico** da app): o backend pode chamar `debug_token` e, em caso de erro, indicar **quais scopes** o token realmente tem (útil para confirmar que não estás a usar token só de WhatsApp). Se for a **mesma** app do WhatsApp, podes usar o mesmo App ID e o mesmo App Secret (não o `WHATSAPP_ACCESS_TOKEN`). Depois: `php artisan config:clear`.

Variáveis gerais: `META_ADS_ENABLED`, `META_GRAPH_VERSION` (ver `backend/.env.example`).

## Serasa Experian — Anti Fraud Scores

Integração com [Anti Fraud Scores](https://developer.serasaexperian.com.br/api/anti-fraud-scores): o backend obtém token IAM (Basic Auth com `clientId`/`clientSecret`), guarda-o em cache e chama `POST …/people/enrichment` com o CPF e os modelos de score (por defeito `FRAUD_SCORE_PF`).

**Modo mock (desenvolvimento):** com `SERASA_SCORE_USE_MOCK=true` (valor por defeito em `config/serasa.php` se não definires o contrário), a rota **não** chama a Serasa e devolve dados fictícios no mesmo formato. Exemplos de CPF: `39053344705`, `11144477735`, `52998224725`. Em produção com API real, define `SERASA_SCORE_USE_MOCK=false` e as credenciais abaixo.

### Variáveis no `backend/.env`

Copia do `backend/.env.example`:

- `SERASA_SCORE_USE_MOCK` — `true` para resposta local fictícia; `false` para chamar a API Serasa.
- `SERASA_IAM_URL` — URL de login IAM (homologação ou produção; há valor UAT por defeito em `config/serasa.php`).
- `SERASA_SCORES_BASE_URL` — base do produto **sem barra final** (ex.: `https://uat-api.serasaexperian.com.br/anti-fraud-scores/v1`).
- `SERASA_CLIENT_ID` e `SERASA_CLIENT_SECRET` — credenciais do contrato Serasa.
- `SERASA_DOCUMENT_DECRYPT_KEY` — chave para descriptografar valores **DOCUMENTCRYPTED** / **DOCUMENTOCRYPTED** da massa de testes da Experian (mesmo fluxo que `cryptocode.decrypt` em Python: scrypt + AES-256-GCM). A chave é fornecida pela equipe de implantação após validação do contrato (`implantacao@experian.com`).

### Endpoint (admin de sistema)

Requer utilizador autenticado com **Sanctum** (`Authorization: Bearer <token>`) e permissão de **admin de sistema** (`is_system_admin`).

`POST /api/admin/score/people` com JSON:

```json
{
  "cpf": "12345678901",
  "models": ["FRAUD_SCORE_PF"]
}
```

`cpf` aceita máscara; o servidor normaliza para 11 dígitos. `models` é opcional; se omitido ou vazio, usa-se `FRAUD_SCORE_PF`.

Resposta de sucesso (201): `{ "ok": true, "cpf": "…", "mock": true|false, "result": { … } }`. O campo `mock` indica se a resposta veio do gerador local. Com API real, `result` é o JSON da Serasa; em mock, inclui `mockMeta` e scores com texto indicativo.

Se `SERASA_SCORE_USE_MOCK` for `false` e `SERASA_SCORES_BASE_URL` ou as credenciais estiverem em falta, o backend responde com erro em tempo de execução (mensagem explícita no corpo ou log).

### Descriptografar documento de teste (massa Experian)

`POST /api/admin/serasa/decrypt-document` com JSON:

```json
{
  "document_encrypted": "cipher*b64*b64*b64"
}
```

A chave vem de `SERASA_DOCUMENT_DECRYPT_KEY` no `.env`. Resposta: `{ "ok": true, "document": "12345678901" }` ou erro `422` se a chave não estiver configurada ou a descriptografia falhar (equivalente a `False` no Python).

Testes unitários que executam o scrypt (custosos) estão no grupo `slow`; na pasta `backend/`, `php artisan test` ignora esse grupo. Para os incluir: `php artisan test --group slow`.

Se o Composer recusar instalar `cast/scrypt` em PHP 8.4 (o pacote declara apenas PHP 7.x), use `composer install --ignore-platform-reqs` ou ajuste a restrição de plataforma conforme a [documentação do Composer](https://getcomposer.org/doc/06-config.md#platform).
