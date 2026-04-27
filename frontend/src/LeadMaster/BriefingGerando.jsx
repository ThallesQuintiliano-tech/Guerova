import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardBody, ListGroup, ListGroupItem } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { mockCampaignGenerationSteps } from './mockData';

export default function BriefingGerando() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const briefing = state?.briefing;
  const title = briefing?.propertyTitle || 'Imóvel selecionado';

  const [doneCount, setDoneCount] = useState(0);

  useEffect(() => {
    if (!briefing) {
      navigate('/leadmaster/campanha/briefing', { replace: true });
      return;
    }
    const steps = mockCampaignGenerationSteps;
    const timers = steps.map((_, i) =>
      setTimeout(() => setDoneCount((c) => Math.max(c, i + 1)), 750 * (i + 1))
    );
    const finish = setTimeout(() => {
      navigate('/leadmaster/campanha/pacote', { state: { briefing } });
    }, 750 * (steps.length + 1) + 500);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finish);
    };
  }, [navigate, briefing]);

  if (!briefing) return null;

  return (
    <div className="p-4 d-flex justify-content-center">
      <Card className="lm-card-soft" style={{ maxWidth: 580, width: '100%' }}>
        <CardBody className="text-center py-5">
          <div className="display-4 mb-3" aria-hidden="true">
            🤖
          </div>
          <h4 className="mb-2">Gerando a campanha…</h4>
          <p className="text-muted mb-4">
            A partir do <strong>briefing do imóvel</strong>, estamos montando o pacote completo para o{' '}
            <strong>Meta Business Suite</strong> (copys, títulos, botões e ideias de criativo).
          </p>
          <p className="small text-start text-muted mb-2">
            Imóvel: <strong>{title}</strong>
          </p>
          <ListGroup flush className="text-start rounded border">
            {mockCampaignGenerationSteps.map((label, i) => {
              const done = i < doneCount;
              return (
                <ListGroupItem key={label} className="d-flex align-items-center gap-2 border-0">
                  <FontAwesomeIcon
                    icon={done ? faCheck : faSpinner}
                    spin={!done}
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
