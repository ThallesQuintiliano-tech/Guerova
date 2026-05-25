import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractMessageContent, getContentType } from '@whiskeysockets/baileys';
import {
  cacheMessageMedia,
  findMediaAbsolutePath,
  getWhatsAppSocket,
  MEDIA_DIR,
} from './media.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SYSTEM_CHATS_FILE = path.join(__dirname, '..', 'auth_data', 'system_chats.json');

/** @type {Map<string, object>} */
const chats = new Map();
/** @type {Map<string, object[]>} */
const messagesByJid = new Map();
/** @type {Map<string, object>} */
const contacts = new Map();
/** @type {Map<string, string>} */
const lidToJid = new Map();
/** @type {Map<string, string>} */
const displayNames = new Map();

/** Conversas iniciadas ou usadas pelo painel Guerova (não histórico do telemóvel). */
/** @type {Set<string>} */
let systemChatJids = new Set();
/** @type {Map<string, string>} */
let customChatNames = new Map();

let saveStateTimer = null;

const SKIP_MESSAGE_TYPES = new Set([
  'protocolMessage',
  'senderKeyDistributionMessage',
  'messageContextInfo',
  'reactionMessage',
  'encReactionMessage',
  'ephemeralMessage',
  'viewOnceMessage',
  'viewOnceMessageV2',
  'deviceSentMessage',
]);

function preferredChatJid(jid) {
  if (!jid) {
    return jid;
  }
  if (jid.endsWith('@g.us')) {
    return jid;
  }
  const resolved = resolveCanonicalJid(jid);
  if (resolved.endsWith('@s.whatsapp.net')) {
    return resolved;
  }
  const phone = formatPhone(resolved) || formatPhone(jid);
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15) {
      return `${digits}@s.whatsapp.net`;
    }
  }
  if (resolved.endsWith('@lid') && lidToJid.has(resolved)) {
    return preferredChatJid(lidToJid.get(resolved));
  }
  return resolved;
}

/** Chave única por contacto (evita duplicar número + LID na lista). */
function chatDedupeKey(jid) {
  const preferred = preferredChatJid(jid);
  if (preferred.endsWith('@g.us')) {
    return preferred;
  }
  const digits = formatPhone(preferred).replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits;
  }
  return preferred;
}

function mergeChatRecords(fromJid, toJid) {
  if (!fromJid || !toJid || fromJid === toJid) {
    return toJid;
  }

  const from = chats.get(fromJid);
  const to = chats.get(toJid) || { id: toJid };

  if (from) {
    to.conversationTimestamp = Math.max(activityMsFromChat(from), activityMsFromChat(to));
    if (from.lastMessage) {
      if (!to.lastMessage || (from.lastMessage.ts || 0) >= (to.lastMessage.ts || 0)) {
        to.lastMessage = from.lastMessage;
      }
    }
    to.unreadCount = (to.unreadCount || 0) + (from.unreadCount || 0);
    to.pinned = Math.max(readPinned(from), readPinned(to));
    if (from.name?.trim() && !to.name?.trim()) {
      to.name = from.name;
    }
    chats.set(toJid, to);
    chats.delete(fromJid);
  }

  const fromMsgs = messagesByJid.get(fromJid);
  if (fromMsgs?.length) {
    const toMsgs = messagesByJid.get(toJid) || [];
    const seen = new Set(toMsgs.map((m) => m.id));
    for (const m of fromMsgs) {
      if (!seen.has(m.id)) {
        toMsgs.push(m);
        seen.add(m.id);
      }
    }
    toMsgs.sort((a, b) => a.ts - b.ts);
    messagesByJid.set(toJid, toMsgs.slice(-300));
    messagesByJid.delete(fromJid);
  }

  const aliasName = customChatNames.get(fromJid) || displayNames.get(fromJid);
  if (aliasName) {
    customChatNames.set(toJid, customChatNames.get(toJid) || aliasName);
    displayNames.set(toJid, displayNames.get(toJid) || aliasName);
    customChatNames.delete(fromJid);
    displayNames.delete(fromJid);
  }

  return toJid;
}

function linkSavedLidAliases() {
  const byName = new Map();
  for (const [jid, name] of customChatNames) {
    if (!name?.trim()) {
      continue;
    }
    const key = name.trim();
    if (!byName.has(key)) {
      byName.set(key, []);
    }
    byName.get(key).push(jid);
  }
  for (const jids of byName.values()) {
    const phoneJid = jids.find((j) => j.endsWith('@s.whatsapp.net'));
    if (!phoneJid) {
      continue;
    }
    for (const alias of jids) {
      if (alias !== phoneJid && alias.endsWith('@lid')) {
        linkLidToJid(alias, phoneJid);
        mergeChatRecords(alias, phoneJid);
        systemChatJids.delete(alias);
      }
    }
  }
}

function normalizeSystemStateAfterLoad() {
  linkSavedLidAliases();

  const nextJids = new Set();
  for (const jid of systemChatJids) {
    nextJids.add(preferredChatJid(jid));
  }
  systemChatJids = nextJids;

  for (const jid of [...chats.keys()]) {
    const preferred = preferredChatJid(jid);
    if (preferred !== jid) {
      mergeChatRecords(jid, preferred);
    }
  }

  for (const [jid, name] of [...customChatNames]) {
    const preferred = preferredChatJid(jid);
    if (preferred !== jid && name) {
      customChatNames.set(preferred, customChatNames.get(preferred) || name);
      customChatNames.delete(jid);
    }
  }

  for (const jid of systemChatJids) {
    if (!chats.has(jid)) {
      chats.set(jid, {
        id: jid,
        name: chatDisplayName(jid),
        conversationTimestamp: 0,
      });
    }
  }
}

function rebuildLastMessageFromHistory(jid) {
  const arr = messagesByJid.get(jid);
  if (!arr?.length) {
    return;
  }
  const last = arr[arr.length - 1];
  const chat = chats.get(jid) || { id: jid };
  if (!chat.lastMessage || (last.ts || 0) >= (chat.lastMessage.ts || 0)) {
    chat.lastMessage = { text: last.text, ts: last.ts, fromMe: last.fromMe };
  }
  chat.conversationTimestamp = Math.max(chat.conversationTimestamp || 0, last.ts || 0);
  chats.set(jid, chat);
}

function loadPersistedMessagesAndChats(data) {
  for (const [jid, arr] of Object.entries(data?.messages || {})) {
    if (!Array.isArray(arr) || !arr.length) {
      continue;
    }
    const preferred = preferredChatJid(jid);
    const existing = messagesByJid.get(preferred) || [];
    const seen = new Set(existing.map((m) => m.id));
    for (const m of arr) {
      if (m?.id && !seen.has(m.id)) {
        existing.push({
          id: m.id,
          type: m.type || 'text',
          text: String(m.text || ''),
          caption: String(m.caption || ''),
          ts: Number(m.ts) || 0,
          fromMe: Boolean(m.fromMe),
          mediaFile: m.mediaFile || null,
          hasMedia: Boolean(m.mediaFile || m.hasMedia),
        });
        seen.add(m.id);
      }
    }
    existing.sort((a, b) => a.ts - b.ts);
    messagesByJid.set(preferred, existing.slice(-300));
    rebuildLastMessageFromHistory(preferred);
  }

  for (const [jid, meta] of Object.entries(data?.chatMeta || {})) {
    if (!meta || typeof meta !== 'object') {
      continue;
    }
    const preferred = preferredChatJid(jid);
    const chat = chats.get(preferred) || { id: preferred };
    if (meta.conversationTimestamp) {
      chat.conversationTimestamp = Number(meta.conversationTimestamp) || 0;
    }
    if (meta.lastMessage?.text) {
      chat.lastMessage = {
        text: String(meta.lastMessage.text),
        ts: Number(meta.lastMessage.ts) || 0,
        fromMe: Boolean(meta.lastMessage.fromMe),
      };
    }
    if (meta.unreadCount) {
      chat.unreadCount = Number(meta.unreadCount) || 0;
    }
    chats.set(preferred, chat);
  }
}

function loadSystemState() {
  try {
    const raw = fs.readFileSync(SYSTEM_CHATS_FILE, 'utf8');
    const data = JSON.parse(raw);
    systemChatJids = new Set(Array.isArray(data?.jids) ? data.jids : []);
    customChatNames = new Map(
      Object.entries(typeof data?.names === 'object' && data.names ? data.names : {})
    );
    for (const [jid, name] of customChatNames) {
      if (name) {
        displayNames.set(jid, name);
      }
    }
    loadPersistedMessagesAndChats(data);
    normalizeSystemStateAfterLoad();
    for (const jid of systemChatJids) {
      rebuildLastMessageFromHistory(jid);
    }
  } catch {
    systemChatJids = new Set();
    customChatNames = new Map();
  }
}

function scheduleSaveSystemState() {
  if (saveStateTimer) {
    clearTimeout(saveStateTimer);
  }
  saveStateTimer = setTimeout(() => {
    saveStateTimer = null;
    saveSystemState();
  }, 350);
}

function saveSystemState() {
  try {
    fs.mkdirSync(path.dirname(SYSTEM_CHATS_FILE), { recursive: true });
    const jids = new Set();
    const names = {};
    const messages = {};
    const chatMeta = {};

    for (const jid of systemChatJids) {
      jids.add(preferredChatJid(jid));
    }
    for (const jid of messagesByJid.keys()) {
      if (isTrackedChat(jid)) {
        jids.add(preferredChatJid(jid));
      }
    }

    for (const [jid, name] of customChatNames) {
      const preferred = preferredChatJid(jid);
      if (name?.trim()) {
        names[preferred] = names[preferred] || name.trim();
      }
    }
    for (const jid of jids) {
      const label = displayNames.get(jid);
      const phone = formatPhone(jid);
      if (label && phone && label !== phone) {
        names[jid] = names[jid] || label;
      }

      const preferred = preferredChatJid(jid);
      const arr = messagesByJid.get(preferred);
      if (arr?.length) {
        messages[preferred] = arr.slice(-300);
      }
      const chat = chats.get(preferred);
      if (chat) {
        chatMeta[preferred] = {
          conversationTimestamp: activityMsFromChat(chat),
          lastMessage: chat.lastMessage || null,
          unreadCount: chat.unreadCount || 0,
        };
      }
    }

    fs.writeFileSync(
      SYSTEM_CHATS_FILE,
      JSON.stringify({ jids: [...jids], names, messages, chatMeta }, null, 0)
    );
  } catch {
    /* ignore */
  }
}

function clearSystemChatJidsFile() {
  try {
    if (fs.existsSync(SYSTEM_CHATS_FILE)) {
      fs.unlinkSync(SYSTEM_CHATS_FILE);
    }
  } catch {
    /* ignore */
  }
}

function labelFromContactsByPhone(digits) {
  if (!digits || digits.length < 10) {
    return null;
  }
  for (const contact of contacts.values()) {
    const candidates = [contact.id, contact.jid, normalizePn(contact.jid)].filter(Boolean);
    for (const id of candidates) {
      const d = formatPhone(id).replace(/\D/g, '');
      if (d === digits) {
        const label =
          contact.name?.trim() ||
          contact.notify?.trim() ||
          contact.verifiedName?.trim() ||
          null;
        if (label) {
          return label;
        }
      }
    }
  }
  return null;
}

function refreshTrackedChatTitles() {
  for (const jid of systemChatJids) {
    const chat = chats.get(jid) || { id: jid };
    chat.name = chatDisplayName(jid);
    chats.set(jid, chat);
  }
}

export function registerSystemChat(jid, customName = null) {
  if (!jid || jid.includes('@broadcast')) {
    return;
  }

  const preferred = preferredChatJid(jid);
  if (jid.endsWith('@lid') && preferred !== jid) {
    linkLidToJid(jid, preferred);
  }

  for (const tracked of [...systemChatJids]) {
    if (tracked !== preferred && chatDedupeKey(tracked) === chatDedupeKey(preferred)) {
      mergeChatRecords(tracked, preferred);
      systemChatJids.delete(tracked);
    }
  }
  mergeChatRecords(jid, preferred);
  systemChatJids.add(preferred);

  const trimmed = customName?.trim();
  if (trimmed) {
    customChatNames.set(preferred, trimmed);
    displayNames.set(preferred, trimmed);
  }

  const title = chatDisplayName(preferred);
  const chat = chats.get(preferred) || { id: preferred };
  chat.name = title;
  if (!chat.conversationTimestamp) {
    chat.conversationTimestamp = Date.now();
  }
  chats.set(preferred, chat);

  saveSystemState();
}

function isTrackedChat(jid) {
  if (!jid) {
    return false;
  }
  const key = chatDedupeKey(jid);
  for (const tracked of systemChatJids) {
    if (chatDedupeKey(tracked) === key) {
      return true;
    }
  }
  return false;
}

/** Limpa cache em memória do WhatsApp e recarrega conversas Guerova do disco. */
export function clearWhatsAppRuntimeCache() {
  chats.clear();
  messagesByJid.clear();
  contacts.clear();
  lidToJid.clear();
  displayNames.clear();
  reloadSystemChatsFromDisk();
}

/** Apaga tudo (conversas Guerova + ficheiros). Só para reset completo. */
export function resetStore() {
  chats.clear();
  messagesByJid.clear();
  contacts.clear();
  lidToJid.clear();
  displayNames.clear();
  systemChatJids = new Set();
  customChatNames = new Map();
  clearSystemChatJidsFile();
}

/** Recarrega conversas do painel após reinício do bridge (mantém auth WhatsApp). */
export function reloadSystemChatsFromDisk() {
  loadSystemState();
  normalizeSystemStateAfterLoad();
  for (const jid of systemChatJids) {
    const chat = chats.get(jid) || { id: jid, conversationTimestamp: 0 };
    chat.name = chatDisplayName(jid);
    chats.set(jid, chat);
  }
  saveSystemState();
}

/** Define ou altera o nome visível de uma conversa do painel. */
export function setChatDisplayName(jid, name) {
  const trimmed = String(name || '').trim();
  if (!jid || !trimmed) {
    throw new Error('JID e nome são obrigatórios.');
  }
  if (!isTrackedChat(jid)) {
    throw new Error('Conversa não registada no Guerova.');
  }
  registerSystemChat(jid, trimmed);
  refreshTrackedChatTitles();
  return { jid, name: chatDisplayName(jid) };
}

/** WhatsApp usa segundos; normalizamos para ms para comparar e ordenar. */
function toSortMs(ts) {
  const n = Number(ts);
  if (!n || Number.isNaN(n)) {
    return 0;
  }
  return n < 1e12 ? n * 1000 : n;
}

function readPinned(chat) {
  const p = chat?.pinned;
  if (p === true) {
    return 1;
  }
  const n = Number(p);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function activityMsFromChat(chat) {
  if (!chat) {
    return 0;
  }
  return Math.max(
    toSortMs(chat.conversationTimestamp),
    toSortMs(chat.lastMessageRecvTimestamp),
    toSortMs(chat.lastMsgTimestamp),
    toSortMs(chat.t),
    toSortMs(chat.lastMessage?.ts)
  );
}

function bumpChatActivity(chat, tsRaw) {
  const tsMs = toSortMs(tsRaw);
  if (tsMs > (chat.conversationTimestamp || 0)) {
    chat.conversationTimestamp = tsMs;
  }
  return chat;
}

function normalizePn(pn) {
  if (!pn) {
    return null;
  }
  const raw = String(pn).trim();
  if (raw.includes('@')) {
    return raw;
  }
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 15) {
    return `${digits}@s.whatsapp.net`;
  }
  return null;
}

export function linkLidToJid(lid, jid) {
  if (!lid || !jid) {
    return;
  }
  lidToJid.set(lid, jid);
  const name = displayNames.get(lid);
  if (name) {
    displayNames.set(jid, name);
  }
}

function registerContact(contact) {
  if (!contact?.id) {
    return;
  }
  const id = contact.id;
  const merged = { ...contacts.get(id), ...contact };
  contacts.set(id, merged);

  const label =
    merged.name?.trim() ||
    merged.notify?.trim() ||
    merged.verifiedName?.trim() ||
    null;

  if (label) {
    displayNames.set(id, label);
  }

  const jid = normalizePn(merged.jid) || (id.endsWith('@s.whatsapp.net') ? id : null);
  const lid = merged.lid || (id.endsWith('@lid') ? id : null);

  if (lid && jid) {
    linkLidToJid(lid, jid);
    if (label) {
      displayNames.set(jid, label);
    }
  }
}

function resolveCanonicalJid(jid) {
  if (!jid) {
    return jid;
  }
  if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@g.us')) {
    return jid;
  }
  if (lidToJid.has(jid)) {
    return lidToJid.get(jid);
  }
  const contact = contacts.get(jid);
  if (contact?.jid) {
    const normalized = normalizePn(contact.jid);
    if (normalized) {
      linkLidToJid(jid, normalized);
      return normalized;
    }
  }
  return jid;
}

export function formatPhone(jid) {
  const canonical = resolveCanonicalJid(jid);
  if (canonical?.endsWith('@g.us')) {
    return '';
  }
  const base = String(canonical || jid).split('@')[0] || '';
  const digits = base.split(':')[0].replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return '';
}

function chatDisplayName(jid) {
  const canonical = resolveCanonicalJid(jid);
  const phone = formatPhone(jid);
  const phoneDigits = phone.replace(/\D/g, '');

  const custom =
    customChatNames.get(jid) ||
    customChatNames.get(canonical) ||
    null;
  if (custom) {
    return custom;
  }

  if (displayNames.has(jid)) {
    const n = displayNames.get(jid);
    if (n && n !== phone) {
      return n;
    }
  }
  if (canonical !== jid && displayNames.has(canonical)) {
    const n = displayNames.get(canonical);
    if (n && n !== formatPhone(canonical)) {
      return n;
    }
  }

  const contact = contacts.get(jid) || contacts.get(canonical);
  const label =
    contact?.name?.trim() ||
    contact?.notify?.trim() ||
    contact?.verifiedName?.trim() ||
    null;
  if (label) {
    displayNames.set(jid, label);
    return label;
  }

  const byPhone = labelFromContactsByPhone(phoneDigits);
  if (byPhone) {
    displayNames.set(jid, byPhone);
    return byPhone;
  }

  const chat = chats.get(jid);
  if (chat?.name?.trim() && chat.name.trim() !== phone) {
    return chat.name.trim();
  }

  if (jid.endsWith('@g.us')) {
    return chat?.name?.trim() || 'Grupo';
  }

  return phone || 'Contacto';
}

function previewLabel(msg) {
  const text = messageText(msg).trim();
  if (text) {
    return text;
  }
  const content = extractMessageContent(msg?.message);
  const type = getContentType(content);
  if (type === 'imageMessage') {
    return '📷 Foto';
  }
  if (type === 'videoMessage') {
    return '🎬 Vídeo';
  }
  if (type === 'audioMessage' || type === 'pttMessage') {
    return '🎤 Áudio';
  }
  if (type === 'stickerMessage') {
    return 'Figurinha';
  }
  if (type === 'documentMessage') {
    return '📎 Documento';
  }
  if (type === 'pollCreationMessage' || type === 'pollUpdateMessage') {
    return '📊 Enquete';
  }
  if (msg?.messageStubType) {
    return '[atualização]';
  }
  return '';
}

function applyMessageToChatMeta(jid, msg) {
  if (!jid || jid.includes('@broadcast') || !isTrackedChat(jid)) {
    return;
  }

  chatJidFromMessage(msg);
  jid = preferredChatJid(jid);
  const rawRemote = msg.key?.remoteJid;
  if (rawRemote && rawRemote !== jid) {
    mergeChatRecords(rawRemote, jid);
  }

  const tsMs = toSortMs(msg.messageTimestamp);
  const chat = chats.get(jid) || { id: jid };
  bumpChatActivity(chat, tsMs);

  const preview = previewLabel(msg);
  const fromMe = Boolean(msg.key?.fromMe);
  if (preview && (!chat.lastMessage || tsMs >= (chat.lastMessage.ts || 0))) {
    chat.lastMessage = { text: preview, ts: tsMs, fromMe };
  } else if (!chat.lastMessage && tsMs > 0) {
    chat.lastMessage = { text: '', ts: tsMs, fromMe };
  }

  if (!chat.name) {
    chat.name = chatDisplayName(jid);
  }
  chats.set(jid, chat);
  scheduleSaveSystemState();
}

export function setMessageMediaFile(jid, messageId, mediaFile) {
  const preferred = preferredChatJid(jid);
  const arr = messagesByJid.get(preferred);
  const row = arr?.find((m) => m.id === messageId);
  if (!row || !mediaFile) {
    return;
  }
  row.mediaFile = mediaFile;
  row.hasMedia = true;
  if (row.type === 'text') {
    row.type = 'image';
  }
  scheduleSaveSystemState();
}

function buildMessageRecord(msg) {
  const content = extractMessageContent(msg.message);
  const waType = getContentType(content) || 'conversation';
  const imageTypes = new Set(['imageMessage', 'stickerMessage']);
  const videoTypes = new Set(['videoMessage']);

  let type = 'text';
  let hasMedia = false;
  if (imageTypes.has(waType)) {
    type = 'image';
    hasMedia = true;
  } else if (videoTypes.has(waType)) {
    type = 'video';
    hasMedia = true;
  }

  const text = messageText(msg).trim();
  let caption = '';
  if (waType === 'imageMessage') {
    caption = content?.imageMessage?.caption || '';
  } else if (waType === 'stickerMessage') {
    caption = '';
  } else if (waType === 'videoMessage') {
    caption = content?.videoMessage?.caption || '';
  }

  return {
    id: msg.key?.id,
    type,
    text,
    caption: String(caption || '').trim(),
    ts: toSortMs(msg.messageTimestamp),
    fromMe: Boolean(msg.key?.fromMe),
    hasMedia,
    mediaFile: null,
  };
}

function queueMessageMediaDownload(jid, waMessage, messageId) {
  const socket = getWhatsAppSocket();
  if (!socket) {
    return;
  }
  cacheMessageMedia(jid, waMessage, messageId)
    .then((mediaFile) => {
      if (mediaFile) {
        setMessageMediaFile(jid, messageId, mediaFile);
      }
    })
    .catch(() => {});
}

function messageText(msg) {
  const content = extractMessageContent(msg.message);
  if (!content) {
    return '';
  }
  const type = getContentType(content);
  if (!type || SKIP_MESSAGE_TYPES.has(type)) {
    return '';
  }
  if (type === 'conversation') {
    return content.conversation || '';
  }
  if (type === 'extendedTextMessage') {
    return content.extendedTextMessage?.text || '';
  }
  if (type === 'imageMessage') {
    return content.imageMessage?.caption || '[imagem]';
  }
  if (type === 'videoMessage') {
    return content.videoMessage?.caption || '[vídeo]';
  }
  if (type === 'audioMessage') {
    return '[áudio]';
  }
  if (type === 'documentMessage') {
    return content.documentMessage?.caption || content.documentMessage?.fileName || '[documento]';
  }
  if (type === 'stickerMessage') {
    return '[sticker]';
  }
  if (type === 'locationMessage') {
    return '[localização]';
  }
  if (type === 'contactMessage') {
    return '[contacto]';
  }
  if (type === 'interactiveMessage') {
    const im = content.interactiveMessage;
    return (
      im?.body?.text ||
      im?.header?.title ||
      im?.nativeFlowMessage?.buttons?.[0]?.name ||
      '[mensagem interativa]'
    );
  }
  if (type === 'buttonsResponseMessage') {
    return content.buttonsResponseMessage?.selectedDisplayText || '[resposta]';
  }
  if (type === 'listResponseMessage') {
    return content.listResponseMessage?.title || '[lista]';
  }
  return '';
}

function chatJidFromMessage(msg) {
  const key = msg.key || {};
  const remote = key.remoteJid;
  if (!remote) {
    return null;
  }

  const alt = normalizePn(key.remoteJidAlt || key.senderPn || key.participantPn);
  if (alt && remote.endsWith('@lid')) {
    linkLidToJid(remote, alt);
  }

  const preferred = preferredChatJid(remote);

  if (!msg.key?.fromMe && msg.pushName?.trim()) {
    const pn = msg.pushName.trim();
    displayNames.set(preferred, pn);
    customChatNames.set(preferred, pn);
    saveSystemState();
  }

  return preferred;
}

function upsertChat(chat) {
  let id = chat?.id;
  if (!id || id === 'status@broadcast' || id.includes('@broadcast')) {
    return;
  }
  if (!isTrackedChat(id)) {
    return;
  }
  id = preferredChatJid(id);
  mergeChatRecords(chat?.id, id);
  const existing = chats.get(id) || { id };
  const name =
    chat.name?.trim() ||
    chat.displayName?.trim() ||
    existing.name;
  if (name) {
    displayNames.set(id, displayNames.get(id) || name);
  }

  const embedded = chat.messages?.[0]?.message ?? chat.messages?.[0];
  if (embedded?.message || embedded?.key) {
    applyMessageToChatMeta(id, embedded);
  }

  const merged = chats.get(id) || { ...existing, id };
  Object.assign(merged, {
    ...existing,
    id,
    name: name || merged.name,
    unreadCount: chat.unreadCount ?? merged.unreadCount ?? 0,
    pinned: Math.max(readPinned(chat), readPinned(merged)),
  });

  merged.conversationTimestamp = Math.max(
    activityMsFromChat(chat),
    activityMsFromChat(existing),
    activityMsFromChat(merged)
  );

  if (chat.lastMessage && typeof chat.lastMessage === 'object') {
    const lm = chat.lastMessage;
    const ts = toSortMs(lm.ts ?? lm.messageTimestamp);
    const text = typeof lm.text === 'string' ? lm.text : previewLabel(lm);
    if (text && (!merged.lastMessage || ts >= (merged.lastMessage.ts || 0))) {
      merged.lastMessage = { text, ts, fromMe: Boolean(lm.fromMe) };
    }
    bumpChatActivity(merged, ts);
  }

  chats.set(id, merged);
}

function appendMessages(jid, msgs) {
  if (!jid || jid.includes('@broadcast') || !isTrackedChat(jid)) {
    return;
  }

  const preferred = preferredChatJid(jid);
  mergeChatRecords(jid, preferred);
  jid = preferred;

  if (!messagesByJid.has(jid)) {
    messagesByJid.set(jid, []);
  }
  const arr = messagesByJid.get(jid);

  for (const msg of msgs) {
    const id = msg.key?.id;
    if (!id) {
      continue;
    }
    if (arr.some((m) => m.id === id)) {
      continue;
    }

    applyMessageToChatMeta(jid, msg);

    const record = buildMessageRecord(msg);
    if (!record.id) {
      continue;
    }
    if (!record.text && !record.hasMedia) {
      continue;
    }

    arr.push(record);
    if (record.hasMedia) {
      queueMessageMediaDownload(jid, msg, record.id);
    }
  }

  arr.sort((a, b) => a.ts - b.ts);
  if (arr.length > 300) {
    messagesByJid.set(jid, arr.slice(-300));
  }
  scheduleSaveSystemState();
}

export function bindStoreEvents(ev) {
  /** Só agenda (nomes) — não importa conversas antigas do telemóvel. */
  ev.on('messaging-history.set', ({ contacts: contactList }) => {
    for (const contact of contactList || []) {
      registerContact(contact);
    }
    refreshTrackedChatTitles();
  });

  ev.on('chats.upsert', (list) => {
    for (const chat of list) {
      if (isTrackedChat(chat?.id)) {
        upsertChat(chat);
      }
    }
  });

  ev.on('chats.update', (updates) => {
    for (const u of updates) {
      if (!u.id || !isTrackedChat(u.id)) {
        continue;
      }
      upsertChat({ ...chats.get(u.id), ...u, id: u.id });
    }
  });

  ev.on('chats.phoneNumberShare', ({ lid, jid }) => {
    const normalized = normalizePn(jid);
    if (lid && normalized) {
      linkLidToJid(lid, normalized);
      if (isTrackedChat(normalized) || isTrackedChat(lid)) {
        mergeChatRecords(lid, preferredChatJid(normalized));
        systemChatJids.delete(lid);
        systemChatJids.add(preferredChatJid(normalized));
        saveSystemState();
      }
    }
  });

  ev.on('contacts.upsert', (list) => {
    for (const c of list) {
      registerContact(c);
    }
    refreshTrackedChatTitles();
  });

  ev.on('contacts.update', (list) => {
    for (const c of list) {
      registerContact(c);
    }
    refreshTrackedChatTitles();
  });

  /** Respostas novas só nas conversas abertas pelo painel. */
  ev.on('messages.upsert', ({ messages }) => {
    for (const m of messages) {
      const jid = chatJidFromMessage(m) || m.key?.remoteJid;
      if (!jid || !isTrackedChat(jid)) {
        continue;
      }
      applyMessageToChatMeta(jid, m);
      appendMessages(jid, [m]);
    }
  });
}

export async function enrichFromSocket() {
  /* Painel só mostra conversas do sistema — não lista grupos do WhatsApp. */
}

function compareChatsLikeWhatsApp(a, b) {
  const aPinned = readPinned(a);
  const bPinned = readPinned(b);
  if (aPinned > 0 && bPinned > 0) {
    if (aPinned !== bPinned) {
      return aPinned - bPinned;
    }
    return activityMsFromChat(b) - activityMsFromChat(a);
  }
  if (aPinned > 0 && bPinned === 0) {
    return -1;
  }
  if (aPinned === 0 && bPinned > 0) {
    return 1;
  }
  return activityMsFromChat(b) - activityMsFromChat(a);
}

export function listChats() {
  const byKey = new Map();

  for (const c of chats.values()) {
    if (!c.id || c.id.includes('@broadcast') || !isTrackedChat(c.id)) {
      continue;
    }
    const id = preferredChatJid(c.id);
    const key = chatDedupeKey(id);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...c, id });
      continue;
    }
    mergeChatRecords(c.id, existing.id);
    byKey.set(key, chats.get(existing.id) || existing);
  }

  for (const jid of systemChatJids) {
    const id = preferredChatJid(jid);
    const key = chatDedupeKey(id);
    if (byKey.has(key)) {
      continue;
    }
    byKey.set(key, chats.get(id) || { id, name: chatDisplayName(id), conversationTimestamp: 0 });
  }

  return [...byKey.values()]
    .sort((a, b) => {
      const aMs = activityMsFromChat(a);
      const bMs = activityMsFromChat(b);
      if (aMs === 0 && bMs === 0) {
        return (a.name || '').localeCompare(b.name || '', 'pt');
      }
      if (aMs === 0) {
        return 1;
      }
      if (bMs === 0) {
        return -1;
      }
      return compareChatsLikeWhatsApp(a, b);
    })
    .map((c) => {
      const name = chatDisplayName(c.id);
      const phone = formatPhone(c.id);
      const lastAt = activityMsFromChat(c);
      return {
        id: c.id,
        name,
        phone: phone || (c.id.endsWith('@g.us') ? '' : ''),
        isGroup: c.id.endsWith('@g.us'),
        pinned: readPinned(c) > 0,
        lastMessage: c.lastMessage?.text?.trim() || '',
        lastAt,
        unreadCount: c.unreadCount || 0,
      };
    });
}

/** Regista mensagem WhatsApp (texto, imagem, etc.) no histórico do painel. */
export function ingestWaMessage(jid, waMsg, customName = null) {
  registerSystemChat(jid, customName);
  applyMessageToChatMeta(jid, waMsg);
  appendMessages(jid, [waMsg]);
  saveSystemState();
}

/** Regista mensagem de texto enviada pelo painel. */
export function recordOutgoingMessage(jid, text, messageId = null, customName = null) {
  const preferred = preferredChatJid(jid);
  ingestWaMessage(
    preferred,
    {
      key: {
        id: messageId || `out-${Date.now()}`,
        remoteJid: preferred,
        fromMe: true,
      },
      message: { conversation: String(text) },
      messageTimestamp: Math.floor(Date.now() / 1000),
    },
    customName
  );
}

export function getChatMessages(jid, limit = 80) {
  if (!isTrackedChat(jid)) {
    return [];
  }
  const preferred = preferredChatJid(jid);
  const buckets = new Set([preferred]);
  for (const [lid, mapped] of lidToJid) {
    if (mapped === preferred) {
      buckets.add(lid);
    }
  }
  for (const cjid of messagesByJid.keys()) {
    if (chatDedupeKey(cjid) === chatDedupeKey(preferred)) {
      buckets.add(cjid);
    }
  }

  const seen = new Set();
  const arr = [];
  for (const bucket of buckets) {
    for (const m of messagesByJid.get(bucket) || []) {
      if (seen.has(m.id)) {
        continue;
      }
      seen.add(m.id);
      arr.push(m);
    }
  }
  arr.sort((a, b) => a.ts - b.ts);

  return arr.slice(-limit).map((m) => ({
    id: m.id,
    type: m.type || 'text',
    text: m.text,
    caption: m.caption || '',
    fromMe: m.fromMe,
    at: m.ts,
    hasMedia: Boolean(m.mediaFile || m.hasMedia),
  }));
}

export function resolveStoredMediaPath(jid, messageId) {
  if (!isTrackedChat(jid)) {
    return null;
  }
  const preferred = preferredChatJid(jid);
  const arr = messagesByJid.get(preferred) || [];
  const row = arr.find((m) => m.id === messageId);
  if (row?.mediaFile) {
    return path.join(MEDIA_DIR, row.mediaFile);
  }
  return findMediaAbsolutePath(preferred, messageId);
}

loadSystemState();
