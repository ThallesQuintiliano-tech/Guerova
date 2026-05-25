import fs from 'fs';
import express from 'express';
import {
  getChats,
  getMessageMediaFile,
  getMessages,
  getSessionSnapshot,
  restoreSessionIfPossible,
  renameChat,
  sendImageMessage,
  sendTextMessage,
  startSession,
  stopSession,
} from './session.js';

const app = express();
const port = Number(process.env.WHATSAPP_BRIDGE_PORT || 3100);
const bridgeSecret = String(process.env.WHATSAPP_BRIDGE_SECRET || '').trim();
const allowOpenLocal =
  process.env.WHATSAPP_BRIDGE_ALLOW_OPEN === '1' ||
  process.env.NODE_ENV !== 'production';

app.use(express.json({ limit: '20mb' }));

function requireSecret(req, res, next) {
  if (allowOpenLocal && bridgeSecret === '') {
    return next();
  }
  const header = String(req.get('x-guerova-secret') || '').trim();
  if (bridgeSecret === '' || header === '' || header !== bridgeSecret) {
    return res.status(403).json({ ok: false, error: 'Invalid or missing X-Guerova-Secret' });
  }
  return next();
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'whatsapp-bridge', time: new Date().toISOString() });
});

app.get('/session', (_req, res) => {
  res.json({ ok: true, ...getSessionSnapshot() });
});

app.post('/session/connect', requireSecret, async (_req, res) => {
  try {
    const snapshot = await startSession();
    res.json({ ok: true, ...snapshot });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

app.post('/session/disconnect', requireSecret, async (_req, res) => {
  try {
    const snapshot = await stopSession();
    res.json({ ok: true, ...snapshot });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

app.get('/chats', async (_req, res) => {
  try {
    const items = getChats();
    res.json({ ok: true, chats: items });
  } catch (e) {
    res.status(503).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      chats: [],
    });
  }
});

app.get('/chats/:jid/messages/:messageId/media', (req, res) => {
  const jid = decodeURIComponent(req.params.jid || '');
  const messageId = decodeURIComponent(req.params.messageId || '');
  try {
    const media = getMessageMediaFile(jid, messageId);
    if (!media?.filePath || !fs.existsSync(media.filePath)) {
      return res.status(404).json({ ok: false, error: 'Media não encontrada.' });
    }
    res.setHeader('Content-Type', media.mime);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return res.send(fs.readFileSync(media.filePath));
  } catch (e) {
    return res.status(503).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

app.get('/chats/:jid/messages', (req, res) => {
  const jid = decodeURIComponent(req.params.jid || '');
  const limit = Math.min(Number(req.query.limit) || 80, 200);
  try {
    const messages = getMessages(jid, limit);
    res.json({ ok: true, jid, messages });
  } catch (e) {
    res.status(503).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      messages: [],
    });
  }
});

app.patch('/chats/:jid', requireSecret, (req, res) => {
  const jid = decodeURIComponent(req.params.jid || '');
  const name = req.body?.name;
  if (!jid || !name) {
    return res.status(422).json({ ok: false, error: 'Envie name no corpo.' });
  }
  try {
    const updated = renameChat(jid, name);
    res.json({ ok: true, chat: updated });
  } catch (e) {
    res.status(400).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

app.post('/messages/send', requireSecret, async (req, res) => {
  const to = req.body?.to ?? req.body?.jid;
  const message = req.body?.message;
  const name = req.body?.name;
  if (!to || !message) {
    return res.status(422).json({
      ok: false,
      error: 'Envie to (número ou jid) e message.',
    });
  }

  try {
    const sent = await sendTextMessage(to, message, name);
    res.json({ ok: true, sent });
  } catch (e) {
    res.status(502).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

app.post('/messages/send-image', requireSecret, async (req, res) => {
  const to = req.body?.to ?? req.body?.jid;
  const image = req.body?.image;
  const mimetype = req.body?.mimetype;
  const caption = req.body?.caption ?? req.body?.message ?? '';
  const name = req.body?.name;
  if (!to || !image) {
    return res.status(422).json({
      ok: false,
      error: 'Envie to (número ou jid) e image (base64).',
    });
  }

  try {
    const sent = await sendImageMessage(to, image, mimetype, caption, name);
    res.json({ ok: true, sent });
  } catch (e) {
    res.status(502).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

app.listen(port, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log(`whatsapp-bridge listening on http://127.0.0.1:${port}`);
  restoreSessionIfPossible().catch(() => {});
});
