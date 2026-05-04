import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Row, Col, Card, CardBody, CardTitle, Button, Badge, Alert, Spinner, FormGroup, Input, Label } from 'reactstrap';
import { buildCampaignPackFromBriefing } from './mockData';
import { useAuth } from '../auth/AuthContext';
import { useInternalCampaigns } from './useInternalCampaigns';

export default function PacoteCampanha() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const briefing = state?.briefing;
  const savedPack = state?.savedPack;
  const savedCampaign = state?.savedCampaign;
  const { isAuthenticated } = useAuth();
  const { apiFetch } = useAuth();
  const { create, update } = useInternalCampaigns();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [publishOpen, setPublishOpen] = useState(() => Boolean(state?.openPublish));
  const [publishing, setPublishing] = useState(false);
  const [publishBanner, setPublishBanner] = useState(null);
  const [metaObjective, setMetaObjective] = useState('OUTCOME_ENGAGEMENT');
  const [dailyBudget, setDailyBudget] = useState(5000); // centavos
  const [adStatus, setAdStatus] = useState('PAUSED');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageHash, setImageHash] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [targetingJson, setTargetingJson] = useState('');

  const pack = useMemo(() => {
    if (!briefing || typeof briefing !== 'object') {
      return null;
    }
    if (savedPack && typeof savedPack === 'object' && Array.isArray(savedPack.headlines)) {
      return savedPack;
    }
    return buildCampaignPackFromBriefing(briefing);
  }, [savedPack, briefing]);

  const defaultTargetingJson = useMemo(() => {
    const age = String(pack?.audienceDraft?.age || '').match(/(\d+)\s*[–-]\s*(\d+)/);
    const ageMin = Number(age?.[1]) || 25;
    const ageMax = Number(age?.[2]) || 54;
    // Observação: "interests" na Meta exige IDs; aqui deixamos vazio por padrão.
    return JSON.stringify(
      {
        geo_locations: { countries: ['BR'] },
        age_min: ageMin,
        age_max: ageMax,
      },
      null,
      2
    );
  }, [pack?.audienceDraft?.age]);

  if (!briefing || typeof briefing !== 'object') {
    return (
      <div className="p-4">
        <Alert color="warning">
          Nenhum briefing encontrado. Volte e preencha o briefing do imóvel.
        </Alert>
        <Button color="primary" type="button" onClick={() => navigate('/leadmaster/campanha/briefing')}>
          Ir para o briefing
        </Button>
      </div>
    );
  }

  const onSave = async () => {
    setSaveError(null);
    if (!isAuthenticated) {
      setSaveError('Faça login para salvar a campanha.');
      return;
    }
    setSaving(true);
    try {
      await create({
        name: briefing?.propertyTitle || 'Campanha',
        briefing,
        pack,
        status: 'DRAFT',
      });
      navigate('/leadmaster/campanhas', { state: { saved: true } });
    } catch (e) {
      setSaveError(e?.message || 'Falha ao salvar campanha.');
    } finally {
      setSaving(false);
    }
  };

  const onPublishToMeta = async () => {
    setPublishBanner(null);
    if (!isAuthenticated) {
      setPublishBanner({ type: 'warning', msg: 'Faça login para publicar na Meta.' });
      return;
    }
    const link = String(linkUrl || briefing?.instagramListingUrl || '').trim();
    if (!link || !/^https?:\/\//i.test(link)) {
      setPublishBanner({ type: 'warning', msg: 'Informe um link válido (ex.: link do post do Instagram).' });
      return;
    }
    if (!String(imageHash || '').trim()) {
      setPublishBanner({
        type: 'warning',
        msg: 'Envie uma imagem para a ad account (botão “Enviar imagem”) ou cole o image_hash manualmente.',
      });
      return;
    }

    let targeting;
    try {
      targeting = JSON.parse((targetingJson || defaultTargetingJson || '').trim());
    } catch {
      setPublishBanner({ type: 'warning', msg: 'O targeting precisa ser um JSON válido.' });
      return;
    }

    const primaryText = pack?.primaryTexts?.[0] || '';
    const headline = pack?.headlines?.[0] || '';
    const description = pack?.descriptions?.[0] || '';

    setPublishing(true);
    try {
      const r = await apiFetch('/api/meta-ads/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign: {
            name: `${briefing?.propertyTitle || 'Campanha'} (Guerova)`,
            objective: metaObjective,
            status: adStatus,
            special_ad_categories: [],
          },
          adset: {
            name: `${briefing?.propertyTitle || 'Campanha'} — Conjunto`,
            daily_budget: Number(dailyBudget) || 5000,
            status: adStatus,
            targeting,
          },
          creative: {
            name: `${briefing?.propertyTitle || 'Campanha'} — Creative`,
            message: primaryText,
            link,
            headline,
            description,
            call_to_action_type: 'LEARN_MORE',
            image_hash: String(imageHash).trim(),
          },
          ad: {
            name: `${briefing?.propertyTitle || 'Campanha'} — Anúncio`,
            status: adStatus,
          },
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || `Erro HTTP ${r.status}`);
      let msg = `Publicado na Meta. IDs: campaign ${j?.ids?.campaign_id || '—'} · adset ${j?.ids?.adset_id || '—'} · ad ${j?.ids?.ad_id || '—'}`;
      if (savedCampaign?.id) {
        try {
          await update(savedCampaign.id, {
            status: adStatus === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
          });
          msg += ' Status da campanha interna atualizado.';
        } catch (err) {
          msg += ` Aviso: não foi possível atualizar o status interno (${err?.message || 'erro'}).`;
        }
      }
      setPublishBanner({
        type: 'success',
        msg,
      });
    } catch (e) {
      setPublishBanner({ type: 'danger', msg: e?.message || 'Falha ao publicar na Meta.' });
    } finally {
      setPublishing(false);
    }
  };

  const onUploadImageToMeta = async () => {
    setPublishBanner(null);
    if (!isAuthenticated) {
      setPublishBanner({ type: 'warning', msg: 'Faça login para enviar a imagem.' });
      return;
    }
    if (!imageFile) {
      setPublishBanner({ type: 'warning', msg: 'Escolha um arquivo de imagem (JPEG, PNG, GIF ou WebP).' });
      return;
    }
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', imageFile);
      const r = await apiFetch('/api/meta-ads/ad-images', {
        method: 'POST',
        body: fd,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || `Erro HTTP ${r.status}`);
      setImageHash(String(j.image_hash || '').trim());
      setPublishBanner({
        type: 'success',
        msg: 'Imagem enviada para a ad account. O image_hash foi preenchido automaticamente.',
      });
    } catch (e) {
      setPublishBanner({ type: 'danger', msg: e?.message || 'Falha ao enviar imagem para a Meta.' });
    } finally {
      setUploadingImage(false);
    }
  };

  const copyBlock = (label, items) => (
    <Card className="lm-card-soft mb-3">
      <CardBody>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <CardTitle tag="h6" className="mb-0 text-primary">
            {label}
          </CardTitle>
          <Button
            size="sm"
            color="light"
            className="border"
            type="button"
            onClick={() => {
              const text = Array.isArray(items) ? items.join('\n\n') : String(items);
              navigator.clipboard.writeText(text);
            }}
          >
            Copiar
          </Button>
        </div>
        {Array.isArray(items) ? (
          <ul className="small mb-0 ps-3">
            {items.map((x) => (
              <li key={x} className="mb-2">
                {x}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small mb-0">{items}</p>
        )}
      </CardBody>
    </Card>
  );

  return (
    <div className="p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h2 className="h4 mb-1">Pacote para o Gerenciador de Negócios</h2>
          <p className="text-muted small mb-0">
            A IA <strong>não substitui</strong> o briefing: ela usa as <strong>variáveis que você preencheu</strong>{' '}
            para gerar textos prontos — você cola nos campos de criação de anúncio (ou usa integração futura).
          </p>
          {savedCampaign?.id ? (
            <p className="small text-primary mb-0 mt-2">
              <strong>Campanha salva:</strong> {savedCampaign.name || '—'} (ID {savedCampaign.id})
            </p>
          ) : null}
        </div>
        <div className="d-flex flex-wrap gap-2">
          {savedCampaign?.id ? (
            <Button outline color="secondary" type="button" onClick={() => navigate('/leadmaster/campanhas')}>
              Voltar às campanhas
            </Button>
          ) : null}
          <Button outline color="secondary" onClick={() => navigate('/leadmaster/campanha/briefing')}>
            Ajustar briefing
          </Button>
          {savedCampaign?.id ? (
            <Button color="secondary" outline disabled title="Esta campanha já está salva na lista.">
              Já salva
            </Button>
          ) : (
            <Button color="primary" disabled={saving} onClick={onSave}>
              {saving ? <Spinner size="sm" className="me-1" /> : null}
              Salvar campanha
            </Button>
          )}
          <Button color="dark" outline onClick={() => setPublishOpen((v) => !v)}>
            Publicar na Meta
          </Button>
          <Button color="success" onClick={() => navigate('/leadmaster/campanha/refinamento', { state: { briefing } })}>
            Refinar campanha
          </Button>
        </div>
      </div>

      {saveError && (
        <Alert color="danger" className="small">
          {saveError}
        </Alert>
      )}

      <Alert color="light" className="border small mb-4">
        <strong>Publicar sem abrir o Gerenciador?</strong> Existem soluções de mercado que exploram fluxo guiado /
        API (ex.:{' '}
        <a href="https://app.giobrain.com/register-landing" target="_blank" rel="noopener noreferrer">
          GioBrain
        </a>
        ). Integração oficial com a Meta exige permissões, revisão de app e políticas — podemos evoluir o produto
        nessa direção após validar o pacote “copiar e colar”.
      </Alert>

      {publishOpen && (
        <Card className="lm-card-soft mb-4" style={{ maxWidth: 860 }}>
          <CardBody>
            <CardTitle tag="h6" className="text-primary mb-3">
              Publicar na Meta Ads (beta)
            </CardTitle>
            {publishBanner && (
              <Alert color={publishBanner.type} className="py-2 small" toggle={() => setPublishBanner(null)}>
                {publishBanner.msg}
              </Alert>
            )}
            <Alert color="warning" className="py-2 small">
              Para publicar via API, configure o token e a ad account em <strong>Configurações → Meta Ads</strong>. Use{' '}
              <strong>Enviar imagem</strong> abaixo para subir o criativo à ad account; a Meta devolve o{' '}
              <code>image_hash</code> usado na publicação (ou cole o hash manualmente, se já tiver um).
            </Alert>

            <Row className="g-3">
              <Col md={6}>
                <FormGroup>
                  <Label>Objective (Meta)</Label>
                  <Input type="select" value={metaObjective} onChange={(e) => setMetaObjective(e.target.value)}>
                    <option value="OUTCOME_ENGAGEMENT">OUTCOME_ENGAGEMENT (Mensagens/Engajamento)</option>
                    <option value="OUTCOME_TRAFFIC">OUTCOME_TRAFFIC (Tráfego)</option>
                    <option value="OUTCOME_LEADS">OUTCOME_LEADS (Leads)</option>
                  </Input>
                  <div className="small text-muted mt-1">O “objetivo sugerido” do pacote é textual; aqui usamos o código da API.</div>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Status inicial</Label>
                  <Input type="select" value={adStatus} onChange={(e) => setAdStatus(e.target.value)}>
                    <option value="PAUSED">PAUSED (recomendado)</option>
                    <option value="ACTIVE">ACTIVE</option>
                  </Input>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Budget diário (centavos)</Label>
                  <Input
                    type="number"
                    min="100"
                    step="50"
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(e.target.value)}
                  />
                  <div className="small text-muted mt-1">Ex.: 5000 = R$ 50,00/dia.</div>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Link do anúncio</Label>
                  <Input
                    placeholder={briefing?.instagramListingUrl || 'https://www.instagram.com/p/...'}
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                </FormGroup>
              </Col>
              <Col md={12}>
                <FormGroup>
                  <Label>Imagem do anúncio</Label>
                  <div className="d-flex flex-wrap align-items-end gap-2">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="flex-grow-1"
                      style={{ maxWidth: 420 }}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setImageFile(f);
                        setPublishBanner(null);
                      }}
                    />
                    <Button color="secondary" outline type="button" disabled={uploadingImage} onClick={onUploadImageToMeta}>
                      {uploadingImage ? <Spinner size="sm" className="me-1" /> : null}
                      Enviar imagem
                    </Button>
                  </div>
                  <div className="small text-muted mt-1">Até ~10 MB. O upload usa a ad account salva na conexão Meta Ads.</div>
                </FormGroup>
              </Col>
              <Col md={12}>
                <FormGroup>
                  <Label>
                    image_hash <span className="text-muted fw-normal">(preenchido após o envio ou cole manualmente)</span>
                  </Label>
                  <Input placeholder="Será preenchido após “Enviar imagem”" value={imageHash} onChange={(e) => setImageHash(e.target.value)} />
                </FormGroup>
              </Col>
              <Col md={12}>
                <FormGroup>
                  <Label>Targeting (JSON)</Label>
                  <Input
                    type="textarea"
                    rows="7"
                    value={targetingJson || defaultTargetingJson}
                    onChange={(e) => setTargetingJson(e.target.value)}
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
                  />
                  <div className="small text-muted mt-1">
                    Dica: interesses na Meta exigem IDs (não nomes). O padrão aqui usa apenas país + faixa etária.
                  </div>
                </FormGroup>
              </Col>
            </Row>

            <div className="d-flex gap-2">
              <Button color="primary" disabled={publishing} onClick={onPublishToMeta}>
                {publishing ? <Spinner size="sm" className="me-1" /> : null}
                Publicar agora
              </Button>
              <Button color="outline-secondary" type="button" onClick={() => setPublishOpen(false)} disabled={publishing}>
                Fechar
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Row className="g-3">
        <Col lg={6}>
          <Card className="lm-card-soft mb-3">
            <CardBody>
              <CardTitle tag="h6" className="text-primary">
                Objetivo sugerido (Meta)
              </CardTitle>
              <Badge color="info" className="mb-2">
                {pack.metaObjective}
              </Badge>
              <p className="small text-muted mb-0">
                Público rascunho: {pack.audienceDraft.age} · {pack.audienceDraft.geoText}
              </p>
              <p className="small mb-0 mt-2">
                <strong>Interesses sugeridos:</strong> {pack.audienceDraft.interests.join(', ')}
              </p>
            </CardBody>
          </Card>
          {copyBlock('Títulos (até 40 caracteres cada)', pack.headlines)}
          {copyBlock('Textos principais', pack.primaryTexts)}
          {copyBlock('Descrições', pack.descriptions)}
          {copyBlock('Botões / CTAs', pack.ctas)}
          {copyBlock('Legendas de link', pack.linkCaptionSuggestions)}
        </Col>
        <Col lg={6}>
          {copyBlock('Ideias de imagem (criativo estático)', pack.imageIdeas)}
          {copyBlock('Roteiro sugerido — vídeo vertical 9:16 (Reels / Stories)', pack.videoScript)}
          <Card className="lm-card-soft">
            <CardBody>
              <CardTitle tag="h6" className="text-primary">
                Mensagem de follow-up (WhatsApp)
              </CardTitle>
              <pre
                className="small bg-light p-3 rounded border mb-3"
                style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
              >
                {pack.whatsappFollowup}
              </pre>
              <p className="small text-muted mb-0">
                Post de referência:{' '}
                <a href={briefing.instagramListingUrl} target="_blank" rel="noopener noreferrer">
                  {briefing.instagramListingUrl}
                </a>
              </p>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
