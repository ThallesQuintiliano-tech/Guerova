import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, CardBody, ListGroup, ListGroupItem } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { getCampaignDisplayName, mockCampaignGenerationSteps } from './campaignBriefing';
import { useAuth } from '../auth/AuthContext';

const API_TIMEOUT_MS = 120_000;
const STEP_MS = 650;

function friendlyFetchError(err) {
  const msg = String(err?.message || '');
  if (err?.name === 'AbortError' || msg.toLowerCase().includes('aborted')) {
    return 'A geração demorou mais que o esperado. Verifique se o backend está ativo e tente novamente.';
  }
  if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('Load failed')) {
    return (
      'Não foi possível contactar o servidor. Confirme que o backend Laravel está a correr ' +
      '(porta 8000) e que o frontend usa o proxy Vite (/api). Se estiver offline, inicie os dois serviços e tente de novo.'
    );
  }
  return msg || 'Falha ao gerar pacote com IA.';
}

export default function BriefingGerando() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { apiFetch, isAuthenticated, booting } = useAuth();
  const briefing = state?.briefing;
  const editCampaign = state?.editCampaign;
  const title = getCampaignDisplayName(briefing);

  const apiFetchRef = useRef(apiFetch);
  const navigateRef = useRef(navigate);
  const editCampaignRef = useRef(editCampaign);
  apiFetchRef.current = apiFetch;
  navigateRef.current = navigate;
  editCampaignRef.current = editCampaign;

  const briefingKey = useMemo(() => {
    if (!briefing) return '';
    try {
      return JSON.stringify(briefing);
    } catch {
      return String(Date.now());
    }
  }, [briefing]);

  const [doneCount, setDoneCount] = useState(0);
  const [error, setError] = useState(null);
  const [waitingApi, setWaitingApi] = useState(true);
  const generationRef = useRef(0);

  const runGeneration = async (genId, { signal } = {}) => {
    const r = await apiFetchRef.current('/api/campaigns/generate-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefing }),
      signal,
    });
    const j = await r.json().catch(() => ({}));

    if (generationRef.current !== genId) {
      return null;
    }

    if (!r.ok || !j?.ok) {
      throw new Error(j?.error || j?.warning || `Falha ao gerar pacote (HTTP ${r.status}).`);
    }

    if (!j?.pack || typeof j.pack !== 'object') {
      throw new Error('Resposta sem pacote de campanha. Tente novamente.');
    }

    return j;
  };

  useEffect(() => {
    if (!briefing) {
      navigateRef.current('/leadmaster/campanha/briefing', { replace: true });
      return undefined;
    }

    if (booting) {
      return undefined;
    }

    if (!isAuthenticated) {
      setError('Faça login para gerar o pacote com IA.');
      setWaitingApi(false);
      return undefined;
    }

    const genId = ++generationRef.current;
    setError(null);
    setDoneCount(0);
    setWaitingApi(true);

    const steps = mockCampaignGenerationSteps;
    const stepTimers = steps.map((_, i) =>
      setTimeout(() => {
        if (generationRef.current === genId) {
          setDoneCount(i + 1);
        }
      }, STEP_MS * (i + 1))
    );

    const controller = new AbortController();
    const apiTimer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    let ignore = false;

    (async () => {
      try {
        const j = await runGeneration(genId, { signal: controller.signal });
        if (!j || ignore) {
          return;
        }

        setWaitingApi(false);

        const finishDelay = Math.max(400, STEP_MS * (steps.length + 1) - STEP_MS * steps.length);
        setTimeout(() => {
          if (generationRef.current !== genId || ignore) {
            return;
          }
          navigateRef.current('/leadmaster/campanha/pacote', {
            state: {
              briefing,
              savedPack: j.pack,
              packSource: j.source,
              packModel: j.model || null,
              packWarning: j.warning || null,
              savedCampaign: editCampaignRef.current
                ? {
                    id: editCampaignRef.current.id,
                    name: editCampaignRef.current.name,
                    status: editCampaignRef.current.status,
                  }
                : null,
            },
          });
        }, finishDelay);
      } catch (e) {
        if (ignore || generationRef.current !== genId) {
          return;
        }
        setWaitingApi(false);
        setError(friendlyFetchError(e));
      } finally {
        clearTimeout(apiTimer);
      }
    })();

    return () => {
      ignore = true;
      stepTimers.forEach(clearTimeout);
      clearTimeout(apiTimer);
      // Não abortar o fetch aqui: remount do React Strict Mode e troca de apiFetch
      // cancelavam pedidos válidos e geravam "Failed to fetch".
    };
  }, [briefingKey, isAuthenticated, booting]);

  const retry = async () => {
    if (!briefing || !isAuthenticated || booting) {
      return;
    }
    setError(null);
    setWaitingApi(true);
    setDoneCount(0);
    const genId = ++generationRef.current;
    const controller = new AbortController();
    const apiTimer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const j = await runGeneration(genId, { signal: controller.signal });
      if (!j || generationRef.current !== genId) {
        return;
      }
      navigateRef.current('/leadmaster/campanha/pacote', {
        state: {
          briefing,
          savedPack: j.pack,
          packSource: j.source,
          packModel: j.model || null,
          packWarning: j.warning || null,
          savedCampaign: editCampaignRef.current
            ? {
                id: editCampaignRef.current.id,
                name: editCampaignRef.current.name,
                status: editCampaignRef.current.status,
              }
            : null,
        },
      });
    } catch (e) {
      if (generationRef.current === genId) {
        setError(friendlyFetchError(e));
      }
    } finally {
      setWaitingApi(false);
      clearTimeout(apiTimer);
    }
  };

  if (!briefing) return null;

  const allStepsDone = doneCount >= mockCampaignGenerationSteps.length;

  return (
    <div className="p-4 d-flex justify-content-center">
      <Card className="lm-card-soft" style={{ maxWidth: 580, width: '100%' }}>
        <CardBody className="text-center py-5">
          <div className="display-4 mb-3" aria-hidden="true">
            🤖
          </div>
          <h4 className="mb-2">Gerando a campanha…</h4>
          <p className="text-muted mb-4">
            A partir do <strong>briefing</strong>, a IA monta o pacote para o{' '}
            <strong>Meta Business Suite</strong>.
          </p>
          <p className="small text-start text-muted mb-2">
            Imóvel: <strong>{title}</strong>
          </p>

          {booting && (
            <Alert color="light" className="text-start small py-2 border">
              A preparar sessão…
            </Alert>
          )}

          {waitingApi && allStepsDone && !error && !booting && (
            <Alert color="info" className="text-start small py-2">
              Passos concluídos — <strong>aguardando resposta da IA</strong> (pode levar até 2 minutos)…
            </Alert>
          )}

          {error && (
            <Alert color="danger" className="text-start small">
              {error}
              <div className="mt-2 d-flex flex-wrap gap-2">
                <Button color="primary" size="sm" type="button" onClick={retry} disabled={waitingApi || booting}>
                  Tentar de novo
                </Button>
                <Button
                  color="light"
                  size="sm"
                  className="border"
                  type="button"
                  onClick={() => navigate('/leadmaster/campanha/briefing')}
                >
                  Voltar ao briefing
                </Button>
              </div>
            </Alert>
          )}

          <ListGroup flush className="text-start rounded border">
            {mockCampaignGenerationSteps.map((label, i) => {
              const done = i < doneCount;
              const spinning = !done && (waitingApi || i === doneCount);
              return (
                <ListGroupItem key={label} className="d-flex align-items-center gap-2 border-0">
                  <FontAwesomeIcon
                    icon={done ? faCheck : faSpinner}
                    spin={spinning}
                    className={done ? 'text-success' : 'text-primary'}
                  />
                  <span className={done ? '' : 'text-muted'}>{label}</span>
                </ListGroupItem>
              );
            })}
          </ListGroup>
        </CardBody>
      </Card>
    </div>
  );
}
