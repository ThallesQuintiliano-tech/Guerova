import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadMediaMessage, extractMessageContent, getContentType } from '@whiskeysockets/baileys';
import pino from 'pino';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MEDIA_DIR = path.join(__dirname, '..', 'auth_data', 'media');
const logger = pino({ level: 'warn' });

/** @type {import('@whiskeysockets/baileys').WASocket | null} */
let whatsappSocket = null;

export function setWhatsAppSocket(socket) {
  whatsappSocket = socket;
}

export function getWhatsAppSocket() {
  return whatsappSocket;
}

function safeJidFolder(jid) {
  return String(jid).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function mimeToExt(mimetype) {
  const m = String(mimetype || '').toLowerCase();
  if (m.includes('png')) {
    return 'png';
  }
  if (m.includes('webp')) {
    return 'webp';
  }
  if (m.includes('gif')) {
    return 'gif';
  }
  if (m.includes('mp4')) {
    return 'mp4';
  }
  if (m.includes('pdf')) {
    return 'pdf';
  }
  return 'jpg';
}

export function mediaRelativePath(jid, messageId, ext) {
  return path.join(safeJidFolder(jid), `${messageId}.${ext}`);
}

export function mediaAbsolutePath(jid, messageId, ext) {
  return path.join(MEDIA_DIR, mediaRelativePath(jid, messageId, ext));
}

export function findMediaAbsolutePath(jid, messageId) {
  const dir = path.join(MEDIA_DIR, safeJidFolder(jid));
  if (!fs.existsSync(dir)) {
    return null;
  }
  const prefix = `${messageId}.`;
  const hit = fs.readdirSync(dir).find((f) => f.startsWith(prefix));
  return hit ? path.join(dir, hit) : null;
}

export function resolveMediaMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * @param {string} jid
 * @param {import('@whiskeysockets/baileys').WAMessage} waMessage
 * @param {string} messageId
 * @returns {Promise<string | null>} relative path under auth_data/media
 */
export async function cacheMessageMedia(jid, waMessage, messageId) {
  const socket = whatsappSocket;
  if (!socket || !waMessage?.message || !messageId) {
    return null;
  }

  const content = extractMessageContent(waMessage.message);
  const contentType = getContentType(content);
  if (!contentType) {
    return null;
  }

  const mediaNode = content[contentType];
  if (!mediaNode) {
    return null;
  }

  const allowed = new Set(['imageMessage', 'stickerMessage', 'videoMessage']);
  if (!allowed.has(contentType)) {
    return null;
  }

  const mimetype = mediaNode.mimetype || (contentType === 'videoMessage' ? 'video/mp4' : 'image/jpeg');
  const ext = mimeToExt(mimetype);
  const abs = mediaAbsolutePath(jid, messageId, ext);
  if (fs.existsSync(abs)) {
    return mediaRelativePath(jid, messageId, ext);
  }

  try {
    const buffer = await downloadMediaMessage(
      waMessage,
      'buffer',
      {},
      { logger, reuploadRequest: socket.updateMediaMessage.bind(socket) }
    );
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buffer);
    return mediaRelativePath(jid, messageId, ext);
  } catch (e) {
    logger.warn({ err: e, messageId }, 'Falha ao descarregar media WhatsApp');
    return null;
  }
}
