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

## WhatsApp (Cloud API — Meta)

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

## Serasa Experian — Anti Fraud Scores

Integração com [Anti Fraud Scores](https://developer.serasaexperian.com.br/api/anti-fraud-scores): o backend obtém token IAM (Basic Auth com `clientId`/`clientSecret`), guarda-o em cache e chama `POST …/people/enrichment` com o CPF e os modelos de score (por defeito `FRAUD_SCORE_PF`).

### Variáveis no `backend/.env`

Copia do `backend/.env.example`:

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

Resposta de sucesso (201): `{ "ok": true, "cpf": "…", "result": { … } }` com o JSON devolvido pela API Serasa.

Se `SERASA_SCORES_BASE_URL` ou as credenciais estiverem em falta, o backend responde com erro em tempo de execução (mensagem explícita no corpo ou log).

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
