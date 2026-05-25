import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, CardBody, ListGroup, ListGroupItem } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { getCampaignDisplayName, mockCampaignGenerationSteps } from './campaignBriefing';
import { useAuth } from '../auth/AuthContext';

const API_TIMEOUT_MS = 90_000;
const STEP_MS = 650;

export default function BriefingGerando() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { apiFetch, isAuthenticated } = useAuth();
  const briefing = state?.briefing;
  const editCampaign = state?.editCampaign;
  const title = getCampaignDisplayName(briefing);

  const [doneCount, setDoneCount] = useState(0);
  const [error, setError] = useState(null);
  const [waitingApi, setWaitingApi] = useState(true);
  const generationRef = useRef(0);

  useEffect(() => {
    if (!briefing) {
      navigate('/leadmaster/campanha/briefing', { replace: true });
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

    (async () => {
      try {
        const r = await apiFetch('/api/campaigns/generate-pack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ briefing }),
          signal: controller.signal,
        });
        const j = await r.json().catch(() => ({}));

        if (generationRef.current !== genId) {
          return;
        }

        if (!r.ok || !j?.ok) {
          throw new Error(j?.error || j?.warning || `Falha ao gerar pacote (HTTP ${r.status}).`);
        }

        if (!j?.pack || typeof j.pack !== 'object') {
          throw new Error('Resposta sem pacote de campanha. Tente novamente.');
        }

        setWaitingApi(false);

        const finishDelay = Math.max(400, STEP_MS * (steps.length + 1) - STEP_MS * steps.length);
        setTimeout(() => {
          if (generationRef.current !== genId) {
            return;
          }
          navigate('/leadmaster/campanha/pacote', {
            state: {
              briefing,
              savedPack: j.pack,
                packSource: j.source,
                packModel: j.model || null,
                packWarning: j.warning || null,
              savedCampaign: editCampaign
                ? { id: editCampaign.id, name: editCampaign.name, status: editCampaign.status }
                : null,
            },
          });
        }, finishDelay);
      } catch (e) {
        if (generationRef.current !== genId) {
          return;
        }
        setWaitingApi(false);
        if (e?.name === 'AbortError') {
          setError(
            'A IA demorou mais de 90 segundos. Verifique GEMINI_API_KEY, quota no Google AI Studio, ou tente de novo.'
          );
        } else {
          setError(e?.message || 'Falha ao gerar pacote com IA.');
        }
      } finally {
        clearTimeout(apiTimer);
      }
    })();

    return () => {
      stepTimers.forEach(clearTimeout);
      clearTimeout(apiTimer);
      controller.abort();
    };
  }, [briefing, editCampaign, isAuthenticated, apiFetch, navigate]);

  const retry = async () => {
    if (!briefing || !isAuthenticated) {
      return;
    }
    setError(null);
    setWaitingApi(true);
    setDoneCount(0);
    const genId = ++generationRef.current;
    const controller = new AbortController();
    const apiTimer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const r = await apiFetch('/api/campaigns/generate-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefing }),
        signal: controller.signal,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok || !j?.pack) {
        throw new Error(j?.error || j?.warning || 'Falha ao gerar pacote.');
      }
      if (generationRef.current === genId) {
        navigate('/leadmaster/campanha/pacote', {
          state: {
            briefing,
            savedPack: j.pack,
                packSource: j.source,
                packModel: j.model || null,
                packWarning: j.warning || null,
            savedCampaign: editCampaign
              ? { id: editCampaign.id, name: editCampaign.name, status: editCampaign.status }
              : null,
          },
        });
      }
    } catch (e) {
      setError(e?.name === 'AbortError' ? 'Tempo esgotado. Tente de novo.' : e?.message || 'Falha.');
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

          {waitingApi && allStepsDone && !error && (
            <Alert color="info" className="text-start small py-2">
              Passos concluídos — <strong>aguardando resposta da IA</strong> (pode levar até 1 minuto)…
            </Alert>
          )}

          {error && (
            <Alert color="danger" className="text-start small">
              {error}
              <div className="mt-2 d-flex flex-wrap gap-2">
                <Button color="primary" size="sm" type="button" onClick={retry} disabled={waitingApi}>
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
