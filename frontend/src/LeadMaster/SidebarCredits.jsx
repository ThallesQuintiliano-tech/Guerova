import { Progress, Button } from 'reactstrap';
import { mockCredits } from './mockData';

export default function SidebarCredits() {
  const pct = Math.round((mockCredits.remaining / mockCredits.total) * 100);

  return (
    <div className="lm-credits-card">
      <h6>{mockCredits.label}</h6>
      <div className="text-muted">{mockCredits.remaining.toLocaleString('pt-BR')} restantes</div>
      <Progress value={pct} />
      <Button color="light" size="sm" block className="text-dark">
        Ver planos
      </Button>
    </div>
  );
}
