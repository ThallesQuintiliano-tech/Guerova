import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestWaWebVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import {
  bindStoreEvents,
  getChatMessages,
  clearWhatsAppRuntimeCache,
  ingestWaMessage,
  listChats,
  reloadSystemChatsFromDisk,
  resolveStoredMediaPath,
  setChatDisplayName,
} from './store.js';
import { resolveMediaMime, setWhatsAppSocket } from './media.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '..', 'auth_data');

/** Dados do painel Guerova — nunca apagar ao desconectar. */
const GUEROVA_PRESERVE_FILES = new Set(['system_chats.json']);
const GUEROVA_PRESERVE_DIRS = new Set(['media']);

/** @type {import('@whiskeysockets/baileys').WASocket | null} */
let sock = null;
let starting = false;
let reconnectTimer = null;
let userInitiatedSession = false;

const session = {
  status: 'disconnected',
  qr: null,
  qrImage: null,
  user: null,
  lastError: null,
};

const logger = pino({ level: process.env.BAILEYS_LOG_LEVEL || 'warn' });

function setUserFromSocket() {
  if (!sock?.user) {
    session.user = null;
    return;
  }
  const { id, name } = sock.user;
  session.user = {
    id: id?.split?.(':')?.[0] ?? id,
    name: name ?? null,
  };
}

async function refreshQrImage(qrString) {
  if (!qrString) {
    session.qrImage = null;
    return;
  }
  try {
    session.qrImage = await QRCode.toDataURL(qrString, {
      margin: 2,
      width: 280,
      errorCorrectionLevel: 'M',
    });
  } catch (e) {
    session.lastError = e instanceof Error ? e.message : String(e);
    session.qrImage = null;
  }
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function clearAuthFiles() {
  if (!fs.existsSync(AUTH_DIR)) {
    return;
  }
  for (const name of fs.readdirSync(AUTH_DIR)) {
    if (GUEROVA_PRESERVE_FILES.has(name) || GUEROVA_PRESERVE_DIRS.has(name)) {
      continue;
    }
    fs.rmSync(path.join(AUTH_DIR, name), { recursive: true, force: true });
  }
}

/** Só restaura sessão WhatsApp se existirem credenciais Baileys (não basta system_chats.json). */
function hasWhatsAppAuthCreds() {
  return fs.existsSync(path.join(AUTH_DIR, 'creds.json'));
}

function disconnectCode(update) {
  return update?.lastDisconnect?.error?.output?.statusCode;
}

function scheduleReconnect(delayMs = 2000) {
  clearReconnectTimer();
  session.status = 'connecting';
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    createSocket({ preserveAuth: true }).catch((e) => {
      session.status = 'disconnected';
      session.lastError = e instanceof Error ? e.message : String(e);
      starting = false;
      userInitiatedSession = false;
    });
  }, delayMs);
}

async function resolveWaVersion() {
  const fallback = [2, 3000, 1023223821];
  try {
    const { version, error } = await fetchLatestWaWebVersion({ timeout: 8000 });
    if (!error && Array.isArray(version) && version.length === 3) {
      return version;
    }
  } catch {
    /* usa fallback */
  }
  return fallback;
}

async function createSocket({ preserveAuth = false } = {}) {
  if (!preserveAuth && userInitiatedSession) {
    clearAuthFiles();
    clearWhatsAppRuntimeCache();
  }

  if (sock) {
    try {
      sock.end(undefined);
    } catch {
      /* ignore */
    }
    sock = null;
  }

  const { version } = { version: await resolveWaVersion() };
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const freshPairing = !state.creds?.registered;

  const socket = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: Browsers.windows('Chrome'),
    /** Histórico completo só após pareamento — evita 428 no QR inicial. */
    syncFullHistory: !freshPairing,
    markOnlineOnConnect: false,
    getMessage: async () => undefined,
  });

  socket.ev.on('creds.update', saveCreds);
  bindStoreEvents(socket.ev);
  setWhatsAppSocket(socket);

  socket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      session.status = 'qr';
      session.qr = qr;
      session.lastError = null;
      starting = false;
      await refreshQrImage(qr);
      logger.info('QR code gerado — escaneie no telemóvel');
    }

    if (connection === 'open') {
      clearReconnectTimer();
      session.status = 'connected';
      session.qr = null;
      session.qrImage = null;
      session.lastError = null;
      starting = false;
      userInitiatedSession = false;
      setUserFromSocket();
      reloadSystemChatsFromDisk();
      logger.info({ user: session.user?.id }, 'WhatsApp conectado');
    }

    if (connection === 'close') {
      const statusCode = disconnectCode({ lastDisconnect });
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      const wasConnected = session.status === 'connected';

      session.qr = null;
      session.qrImage = null;

      if (loggedOut) {
        clearReconnectTimer();
        setWhatsAppSocket(null);
        session.status = 'disconnected';
        session.user = null;
        sock = null;
        starting = false;
        userInitiatedSession = false;
        clearAuthFiles();
        clearWhatsAppRuntimeCache();
        session.lastError = 'Sessão terminada no telemóvel. Gere um novo QR Code.';
        return;
      }

      const shouldReconnect =
        statusCode === DisconnectReason.restartRequired ||
        statusCode === DisconnectReason.connectionClosed ||
        statusCode === DisconnectReason.timedOut ||
        statusCode === DisconnectReason.connectionLost;

      logger.warn({ statusCode }, 'Conexão WhatsApp fechada');

      sock = null;

      if (shouldReconnect && wasConnected) {
        session.lastError = null;
        scheduleReconnect(statusCode === DisconnectReason.restartRequired ? 1000 : 2500);
        return;
      }

      clearReconnectTimer();
      setWhatsAppSocket(null);
      if (!wasConnected) {
        clearAuthFiles();
      }
      session.status = 'disconnected';
      session.user = null;
      starting = false;
      userInitiatedSession = false;
      session.lastError =
        statusCode === DisconnectReason.connectionReplaced
          ? 'Esta sessão foi substituída noutro dispositivo. Desligue o WhatsApp Web antigo e tente de novo.'
          : statusCode === DisconnectReason.forbidden
            ? 'WhatsApp recusou a ligação (403). Atualize o app no telemóvel e tente outra vez.'
            : wasConnected
              ? `Ligação perdida (código ${statusCode ?? '?'}). Clique em «Mostrar QR Code».`
              : 'Não foi possível obter o QR. Aguarde um minuto e clique em «Mostrar QR Code» novamente.';
    }
  });

  sock = socket;

  if (socket.user) {
    session.status = 'connected';
    setUserFromSocket();
    starting = false;
    userInitiatedSession = false;
  }

  return socket;
}

export function getSessionSnapshot() {
  return {
    status: session.status,
    qr: session.qr,
    qrImage: session.qrImage,
    user: session.user,
    lastError: session.lastError,
  };
}

export async function restoreSessionIfPossible() {
  if (sock && session.status === 'connected') {
    return getSessionSnapshot();
  }
  if (!hasWhatsAppAuthCreds()) {
    return getSessionSnapshot();
  }
  if (starting) {
    return getSessionSnapshot();
  }

  starting = true;
  userInitiatedSession = false;
  session.status = 'connecting';
  session.lastError = null;

  try {
    await createSocket({ preserveAuth: true });
  } catch (e) {
    session.status = 'disconnected';
    session.lastError = e instanceof Error ? e.message : String(e);
    sock = null;
    starting = false;
  }

  return getSessionSnapshot();
}

export async function startSession() {
  if (sock && session.status === 'connected') {
    setUserFromSocket();
    return getSessionSnapshot();
  }

  /** Interrompe restore automático ou loop de reconexão para gerar novo QR. */
  clearReconnectTimer();
  if (sock) {
    try {
      sock.end(undefined);
    } catch {
      /* ignore */
    }
    sock = null;
  }

  starting = true;
  userInitiatedSession = true;
  session.lastError = null;
  session.status = 'connecting';

  try {
    await createSocket({ preserveAuth: false });
  } catch (e) {
    session.status = 'disconnected';
    session.lastError = e instanceof Error ? e.message : String(e);
    sock = null;
    starting = false;
    userInitiatedSession = false;
  }

  return getSessionSnapshot();
}

export async function stopSession() {
  clearReconnectTimer();
  userInitiatedSession = false;
  setWhatsAppSocket(null);

  if (sock) {
    try {
      sock.end(undefined);
    } catch {
      /* ignore */
    }
    sock = null;
  }

  /** Mantém credenciais WhatsApp + conversas/mensagens Guerova em auth_data. */
  clearWhatsAppRuntimeCache();
  session.status = 'disconnected';
  session.qr = null;
  session.qrImage = null;
  session.user = null;
  session.lastError = null;
  starting = false;

  return getSessionSnapshot();
}

function resolveJid(to) {
  const raw = String(to).trim();
  if (raw.includes('@')) {
    return raw;
  }
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) {
    throw new Error('Número inválido (use DDI + DDD + número, só dígitos).');
  }
  return `${digits}@s.whatsapp.net`;
}

export function requireConnected() {
  if (!sock || session.status !== 'connected') {
    throw new Error('WhatsApp não está conectado. Escaneie o QR Code primeiro.');
  }
  return sock;
}

export function getChats() {
  reloadSystemChatsFromDisk();
  return listChats();
}

export function getMessages(jid, limit = 80) {
  reloadSystemChatsFromDisk();
  return getChatMessages(jid, limit);
}

export function renameChat(jid, name) {
  requireConnected();
  return setChatDisplayName(jid, name);
}

export async function sendTextMessage(to, text, customName = null) {
  const socket = requireConnected();
  const jid = resolveJid(to);
  const body = String(text).trim();
  if (!body) {
    throw new Error('Mensagem vazia.');
  }

  const result = await socket.sendMessage(jid, { text: body });
  const messageId = result?.key?.id ?? null;

  ingestWaMessage(
    jid,
    {
      key: result?.key ?? { id: messageId, remoteJid: jid, fromMe: true },
      message: result?.message ?? { conversation: body },
      messageTimestamp: Math.floor(Date.now() / 1000),
    },
    customName
  );

  return {
    jid,
    messageId,
  };
}

export async function sendImageMessage(to, imageBase64, mimetype, caption, customName = null) {
  const socket = requireConnected();
  const jid = resolveJid(to);
  const buffer = Buffer.from(String(imageBase64), 'base64');
  if (!buffer.length) {
    throw new Error('Imagem inválida.');
  }

  const result = await socket.sendMessage(jid, {
    image: buffer,
    mimetype: mimetype || 'image/jpeg',
    caption: caption?.trim() || undefined,
  });

  const messageId = result?.key?.id ?? null;
  ingestWaMessage(
    jid,
    {
      key: result?.key ?? { id: messageId, remoteJid: jid, fromMe: true },
      message: result?.message,
      messageTimestamp: Math.floor(Date.now() / 1000),
    },
    customName
  );

  return { jid, messageId };
}

export function getMessageMediaFile(jid, messageId) {
  requireConnected();
  const filePath = resolveStoredMediaPath(jid, messageId);
  if (!filePath) {
    return null;
  }
  return { filePath, mime: resolveMediaMime(filePath) };
}
