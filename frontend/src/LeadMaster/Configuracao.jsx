import { Card, CardBody, CardTitle, Label, Input, FormGroup } from 'reactstrap';

export default function Configuracao() {
  return (
    <div className="p-4">
      <h2 className="h4 mb-4">Configurações</h2>
      <Card className="lm-card-soft" style={{ maxWidth: 640 }}>
        <CardBody>
          <CardTitle tag="h6" className="mb-3">
            Contas de anúncios (mock)
          </CardTitle>
          <FormGroup>
            <Label>ID da conta Meta (Business)</Label>
            <Input placeholder="act_1234567890" defaultValue="act_9876543210" />
          </FormGroup>
          <FormGroup>
            <Label>ID do cliente Google Ads (MCC)</Label>
            <Input placeholder="123-456-7890" defaultValue="555-0199-0000" />
          </FormGroup>
          <FormGroup>
            <Label>Pixel / Tag de conversão</Label>
            <Input placeholder="Pixel ID" defaultValue="123456789012345" />
          </FormGroup>
        </CardBody>
      </Card>
    </div>
  );
}
