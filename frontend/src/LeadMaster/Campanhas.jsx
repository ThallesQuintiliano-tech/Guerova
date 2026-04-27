import { Link } from 'react-router-dom';
import { Card, CardBody, CardTitle, Table, Badge, Button } from 'reactstrap';
import { mockCampaignsAdsManager } from './mockData';

export default function Campanhas() {
  return (
    <div className="p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">Campanhas</h2>
          <p className="text-muted small mb-0">
            Lista no estilo <strong>Gerenciador de Anúncios</strong> — status, orçamento e performance.
          </p>
        </div>
        <Button tag={Link} color="primary" className="rounded-pill" to="/leadmaster/campanha/briefing">
          + Nova campanha (briefing + IA)
        </Button>
      </div>
      <Card className="lm-card-soft">
        <CardBody>
          <CardTitle tag="h6" className="mb-3">
            Todas as campanhas
          </CardTitle>
          <Table responsive hover className="small align-middle mb-0">
            <thead>
              <tr>
                <th>Campanha</th>
                <th>Plataforma</th>
                <th>Status</th>
                <th>Objetivo</th>
                <th className="text-end">Orçamento/dia</th>
                <th className="text-end">Gasto 7d</th>
                <th className="text-end">Leads</th>
                <th className="text-end">Qualidade</th>
              </tr>
            </thead>
            <tbody>
              {mockCampaignsAdsManager.map((c) => (
                <tr key={c.id}>
                  <td className="fw-semibold">{c.name}</td>
                  <td>{c.platform}</td>
                  <td>
                    <Badge color={c.status === 'ACTIVE' ? 'success' : 'warning'} pill>
                      {c.status}
                    </Badge>
                  </td>
                  <td>{c.objective}</td>
                  <td className="text-end">R$ {c.dailyBudget.toFixed(2)}</td>
                  <td className="text-end">R$ {c.spend7d.toFixed(2)}</td>
                  <td className="text-end">{c.leads7d}</td>
                  <td className="text-end text-muted">
                    {c.platform === 'Meta' ? (
                      <>
                        freq. {c.frequency} · {c.qualityRanking}
                      </>
                    ) : (
                      <>
                        impr. share {c.searchImprShare}% · score {c.optimizationScore}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
