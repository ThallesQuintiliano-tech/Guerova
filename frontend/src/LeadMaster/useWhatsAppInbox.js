import { useCallback, useEffect, useRef, useState } from 'react';

const CHATS_POLL_MS = 5000;
const MESSAGES_POLL_MS = 3000;

export function whatsappMessageMediaUrl(jid, messageId) {
  return `/api/whatsapp/web/chats/${encodeURIComponent(jid)}/messages/${encodeURIComponent(messageId)}/media`;
}

function formatTime(ts) {
  if (!ts) return '';
  const ms = ts < 1e12 ? ts * 1000 : ts;
  const d = new Date(ms);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** @param {boolean} connected WhatsApp ligado (envio em tempo real); histórico carrega sempre. */
export function useWhatsAppInbox(connected) {
  const [chats, setChats] = useState([]);
  const [selectedJid, setSelectedJid] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const selectedRef = useRef(selectedJid);

  useEffect(() => {
    selectedRef.current = selectedJid;
  }, [selectedJid]);

  const fetchChats = useCallback(async () => {
    const r = await fetch('/api/whatsapp/web/chats');
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(j?.error || `HTTP ${r.status}`);
    }
    return j.chats || [];
  }, []);

  const fetchMessages = useCallback(async (jid) => {
    const r = await fetch(`/api/whatsapp/web/chats/${encodeURIComponent(jid)}/messages`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(j?.error || `HTTP ${r.status}`);
    }
    return j.messages || [];
  }, []);

  const refreshChats = useCallback(async () => {
    try {
      const items = await fetchChats();
      setChats(items);
      setError(null);
      if (!selectedRef.current && items.length > 0) {
        setSelectedJid(items[0].id);
      }
    } catch (e) {
      setError(e?.message || 'Falha ao carregar conversas.');
    } finally {
      setLoadingChats(false);
    }
  }, [fetchChats]);

  const refreshMessages = useCallback(
    async (jid) => {
      if (!jid) return;
      setLoadingMessages(true);
      try {
        const items = await fetchMessages(jid);
        if (selectedRef.current === jid) {
          setMessages(items);
        }
        setError(null);
      } catch (e) {
        setError(e?.message || 'Falha ao carregar mensagens.');
      } finally {
        setLoadingMessages(false);
      }
    },
    [fetchMessages]
  );

  useEffect(() => {
    setLoadingChats(true);
    refreshChats();
    const pollMs = connected ? CHATS_POLL_MS : CHATS_POLL_MS * 2;
    const id = setInterval(refreshChats, pollMs);
    return () => clearInterval(id);
  }, [connected, refreshChats]);

  useEffect(() => {
    if (!selectedJid) {
      setMessages([]);
      return undefined;
    }
    refreshMessages(selectedJid);
    if (!connected) {
      return undefined;
    }
    const id = setInterval(() => refreshMessages(selectedJid), MESSAGES_POLL_MS);
    return () => clearInterval(id);
  }, [connected, selectedJid, refreshMessages]);

  const sendToNumber = useCallback(async () => {
    if (!connected) {
      setError('Conecte o WhatsApp para enviar mensagens.');
      return;
    }
    const digits = newPhone.replace(/\D/g, '');
    const text = newMessage.trim();
    if (digits.length < 10 || !text) {
      return;
    }
    setSending(true);
    setError(null);
    try {
      const r = await fetch('/api/whatsapp/web/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          to: digits,
          message: text,
          ...(newContactName.trim() ? { name: newContactName.trim() } : {}),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      let jid = j?.whatsapp?.jid || `${digits}@s.whatsapp.net`;
      setNewMessage('');
      await refreshChats();
      const items = await fetchChats();
      setChats(items);
      const match =
        items.find((c) => c.id === jid) ||
        items.find((c) => String(c.phone || '').replace(/\D/g, '') === digits);
      if (match) {
        jid = match.id;
      }
      setSelectedJid(jid);
      await refreshMessages(jid);
    } catch (e) {
      setError(e?.message || 'Falha ao enviar para este número.');
    } finally {
      setSending(false);
    }
  }, [connected, newPhone, newContactName, newMessage, refreshChats, refreshMessages, fetchChats]);

  const sendMessage = useCallback(async () => {
    if (!connected) {
      setError('Conecte o WhatsApp para enviar mensagens.');
      return;
    }
    const text = draft.trim();
    if (!selectedJid || !text) return;
    setSending(true);
    setError(null);
    try {
      const r = await fetch('/api/whatsapp/web/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ jid: selectedJid, message: text }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      setDraft('');
      await refreshMessages(selectedJid);
      await refreshChats();
    } catch (e) {
      setError(e?.message || 'Falha ao enviar mensagem.');
    } finally {
      setSending(false);
    }
  }, [connected, draft, selectedJid, refreshChats, refreshMessages]);

  const sendImageFile = useCallback(
    async (file) => {
      if (!connected) {
        setError('Conecte o WhatsApp para enviar imagens.');
        return;
      }
      if (!selectedJid || !file?.type?.startsWith('image/')) {
        return;
      }
      setSending(true);
      setError(null);
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const raw = String(reader.result || '');
            const comma = raw.indexOf(',');
            resolve(comma >= 0 ? raw.slice(comma + 1) : raw);
          };
          reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
          reader.readAsDataURL(file);
        });
        const caption = draft.trim();
        const r = await fetch('/api/whatsapp/web/send-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            jid: selectedJid,
            image: base64,
            mimetype: file.type || 'image/jpeg',
            ...(caption ? { caption } : {}),
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j?.ok) {
          throw new Error(j?.error || `HTTP ${r.status}`);
        }
        setDraft('');
        await refreshMessages(selectedJid);
        await refreshChats();
      } catch (e) {
        setError(e?.message || 'Falha ao enviar imagem.');
      } finally {
        setSending(false);
      }
    },
    [connected, draft, selectedJid, refreshChats, refreshMessages]
  );

  const selectedChat = chats.find((c) => c.id === selectedJid) || null;

  const saveChatName = useCallback(
    async (name) => {
      const trimmed = String(name || '').trim();
      if (!selectedJid || !trimmed) {
        return;
      }
      setSending(true);
      setError(null);
      try {
        const r = await fetch(`/api/whatsapp/web/chats/${encodeURIComponent(selectedJid)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ name: trimmed }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j?.ok) {
          throw new Error(j?.error || `HTTP ${r.status}`);
        }
        await refreshChats();
      } catch (e) {
        setError(e?.message || 'Falha ao guardar nome.');
      } finally {
        setSending(false);
      }
    },
    [selectedJid, refreshChats]
  );

  return {
    chats,
    selectedJid,
    setSelectedJid,
    selectedChat,
    messages,
    loadingChats,
    loadingMessages,
    sending,
    error,
    connected,
    draft,
    setDraft,
    sendMessage,
    sendToNumber,
    newPhone,
    setNewPhone,
    newContactName,
    setNewContactName,
    newMessage,
    setNewMessage,
    formatTime,
    refreshChats,
    saveChatName,
    sendImageFile,
    whatsappMessageMediaUrl,
  };
}
