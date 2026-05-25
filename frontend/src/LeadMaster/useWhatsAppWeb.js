import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_MS = 2000;

export function useWhatsAppWeb() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    const r = await fetch('/api/whatsapp/web/status');
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(j?.error || `HTTP ${r.status}`);
    }
    setStatus(j);
    setError(null);
    return j;
  }, []);

  const refresh = useCallback(async () => {
    try {
      await fetchStatus();
    } catch (e) {
      setError(e?.message || 'Falha ao ler estado do WhatsApp Web.');
      setStatus((prev) => prev ?? { bridge_online: false });
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    const needsPoll =
      status?.bridge_online &&
      (status?.status === 'qr' || status?.status === 'connecting');
    if (!needsPoll) {
      return undefined;
    }
    pollRef.current = setInterval(() => {
      fetchStatus().catch(() => {});
    }, POLL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [status?.bridge_online, status?.status, fetchStatus]);

  const connect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/whatsapp/web/connect', { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      setStatus((prev) => ({
        ...prev,
        provider: 'whatsapp_web',
        enabled: true,
        bridge_online: true,
        status: j.status,
        qr: j.qr,
        qrImage: j.qrImage,
        user: j.user,
        lastError: j.lastError,
      }));
      await fetchStatus();
    } catch (e) {
      setError(e?.message || 'Não foi possível iniciar a conexão.');
    } finally {
      setBusy(false);
    }
  }, [fetchStatus]);

  const disconnect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/whatsapp/web/disconnect', { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      await fetchStatus();
    } catch (e) {
      setError(e?.message || 'Não foi possível desconectar.');
    } finally {
      setBusy(false);
    }
  }, [fetchStatus]);

  const connected = status?.status === 'connected';
  const awaitingQr = status?.status === 'qr' && Boolean(status?.qrImage);
  const connecting = status?.status === 'connecting';

  return {
    status,
    loading,
    busy,
    error,
    connected,
    awaitingQr,
    connecting,
    connect,
    disconnect,
    refresh,
  };
}
