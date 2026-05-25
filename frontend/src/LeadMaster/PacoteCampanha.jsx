import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Row, Col, Card, CardBody, CardTitle, Button, Badge, Alert, Spinner, FormGroup, Input, Label } from 'reactstrap';
import { buildCampaignPackFromBriefing } from './mockData';
import { getCampaignDisplayName, parseDailyBudgetCents } from './campaignBriefing';
import { useAuth } from '../auth/AuthContext';
import { useInternalCampaigns } from './useInternalCampaigns';

export default function PacoteCampanha() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const briefing = state?.briefing;
  const savedPack = state?.savedPack;
  const packSource = state?.packSource;
  const packModel = state?.packModel;
  const packWarning = state?.packWarning;
  const savedCampaign = state?.savedCampaign;
  const { isAuthenticated } = useAuth();
  const { apiFetch } = useAuth();
  const { create, update: updateCampaign } = useInternalCampaigns();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [publishOpen, setPublishOpen] = useState(() => Boolean(state?.openPublish));
  const [publishing, setPublishing] = useState(false);
  const [publishBanner, setPublishBanner] = useState(null);
  const [metaObjective, setMetaObjective] = useState('OUTCOME_ENGAGEMENT');
  const [dailyBudget, setDailyBudget] = useState(() => parseDailyBudgetCents(briefing));
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
    if (
      savedPack &&
      typeof savedPack === 'object' &&
      (Array.isArray(savedPack.headlines) || Array.isArray(savedPack?.adCopy?.headlines))
    ) {
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
      if (savedCampaign?.id) {
        await updateCampaign(savedCampaign.id, {
          name: getCampaignDisplayName(briefing),
          briefing,
          pack,
        });
      } else {
        await create({
          name: getCampaignDisplayName(briefing),
          briefing,
          pack,
          status: 'DRAFT',
        });
      }
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

    const primaryText = pack?.adCopy?.primaryTexts?.[0] || pack?.primaryTexts?.[0] || '';
    const headline = pack?.adCopy?.headlines?.[0] || pack?.headlines?.[0] || '';
    const description = pack?.adCopy?.descriptions?.[0] || pack?.descriptions?.[0] || '';
    const campaignLabel = getCampaignDisplayName(briefing);

    setPublishing(true);
    try {
      const r = await apiFetch('/api/meta-ads/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign: {
            name: `${briefing?.campaignName || campaignLabel} (Guerova)`,
            objective: metaObjective,
            status: adStatus,
            special_ad_categories: [],
          },
          adset: {
            name: briefing?.adSetName || `${campaignLabel} — Conjunto`,
            daily_budget: Number(dailyBudget) || parseDailyBudgetCents(briefing),
            status: adStatus,
            targeting,
          },
          creative: {
            name: `${campaignLabel} — Creative`,
            message: primaryText,
            link,
            headline,
            description,
            call_to_action_type: 'LEARN_MORE',
            image_hash: String(imageHash).trim(),
          },
          ad: {
            name: `${campaignLabel} — Anúncio`,
            status: adStatus,
          },
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || `Erro HTTP ${r.status}`);
      let msg = `Publicado na Meta. IDs: campaign ${j?.ids?.campaign_id || '—'} · adset ${j?.ids?.adset_id || '—'} · ad ${j?.ids?.ad_id || '—'}`;
      if (savedCampaign?.id) {
        try {
          await updateCampaign(savedCampaign.id, {
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

  const settingsRows = [
    ['Campanha', pack?.campaign?.name || briefing?.campaignName],
    ['Objetivo', pack?.campaign?.objective || pack?.metaObjective],
    ['Orçamento', pack?.campaign?.budgetStrategy || briefing?.budgetStrategy],
    ['Conjunto', pack?.adSet?.name || briefing?.adSetName],
    ['Conversão', pack?.adSet?.conversionType || briefing?.conversionType],
    ['Público', pack?.adSet?.targetAudience || briefing?.targetAudience],
    ['Geo', pack?.adSet?.geoTargeting || briefing?.geoTargeting],
    ['Budget diário', pack?.adSet?.dailyBudget || briefing?.dailyBudget],
    ['Período', pack?.adSet?.schedulePeriod || briefing?.schedulePeriod],
    ['Interesses', pack?.adSet?.interestsSegment || briefing?.interestsSegment],
    ['Posicionamentos', pack?.adSet?.placements || briefing?.placements],
    ['Lances', pack?.adSet?.bidStrategy || briefing?.bidStrategy],
    ['Imóvel', pack?.ad?.propertyName || briefing?.propertyName],
    ['Tipo', pack?.ad?.propertyType || briefing?.propertyType],
    ['Preço', pack?.ad?.priceRange || briefing?.priceRange],
    ['Formato', pack?.ad?.format || briefing?.adFormat],
    ['CTA', pack?.ad?.cta || briefing?.cta],
  ].filter(([, v]) => v);

  const copyBlock = (label, items, aiGenerated = false) => (
    <Card className="lm-card-soft mb-3">
      <CardBody>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <CardTitle tag="h6" className="mb-0 text-primary">
            {label}
            {aiGenerated ? (
              <Badge color="success" className="ms-2 fw-normal">
                IA
              </Badge>
            ) : null}
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
          {packSource === 'gemini' ? (
            <Badge color="success" className="mt-2 me-1">
              IA Gemini{packModel ? ` · ${packModel}` : ''}
            </Badge>
          ) : packSource === 'mock_fallback' ? (
            <Badge color="warning" className="mt-2">
              Textos locais (sem IA — quota Gemini ou erro de API)
            </Badge>
          ) : null}
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
          <Button color="primary" disabled={saving} onClick={onSave}>
            {saving ? <Spinner size="sm" className="me-1" /> : null}
            {savedCampaign?.id ? 'Guardar alterações' : 'Salvar campanha'}
          </Button>
          <Button color="dark" outline onClick={() => setPublishOpen((v) => !v)}>
            Publicar na Meta
          </Button>
          <Button color="success" onClick={() => navigate('/leadmaster/campanha/refinamento', { state: { briefing } })}>
            Refinar campanha
          </Button>
        </div>
      </div>

      {packWarning && (
        <Alert color="warning" className="small">
          {packWarning}
        </Alert>
      )}

      {saveError && (
        <Alert color="danger" className="small">
          {saveError}
        </Alert>
      )}

      <Alert color="light" className="border small mb-4">
        <strong>Publicação direta na Meta (beta):</strong> o Guerova já pode criar campanha, conjunto, criativo e
        anúncio via Marketing API quando configurar token e ad account em{' '}
        <strong>Configurações → Meta Ads</strong>. Para um teste rápido sem briefing, use também a secção{' '}
        <strong>Campanha de teste na Meta</strong> em <strong>Configurações → Meta Ads</strong>. Em produção alargada, a app Meta pode precisar de{' '}
        <a href="https://developers.facebook.com/docs/development/release" target="_blank" rel="noopener noreferrer">
          revisão
        </a>{' '}
        e cumprir políticas de anúncios — o pacote abaixo continua útil para copiar textos para o Gerenciador manualmente.
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
              Confirme em <strong>Configurações → Meta Ads</strong> que o token, a ad account e o <strong>Page ID</strong>{' '}
              estão guardados (o criativo de ligação usa a Página). Envie a imagem com <strong>Enviar imagem</strong> para
              obter o <code>image_hash</code>, ou cole-o se já existir na biblioteca da conta.
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
        <Col lg={5}>
          <Card className="lm-card-soft mb-3">
            <CardBody>
              <CardTitle tag="h6" className="text-primary mb-3">
                Configuração (briefing)
              </CardTitle>
              <ul className="small mb-0 ps-3">
                {settingsRows.map(([k, v]) => (
                  <li key={k} className="mb-2">
                    <strong>{k}:</strong> {v}
                  </li>
                ))}
              </ul>
              {pack?.ad?.highlights || briefing?.propertyHighlights ? (
                <p className="small mt-3 mb-0">
                  <strong>Diferenciais:</strong> {pack?.ad?.highlights || briefing?.propertyHighlights}
                </p>
              ) : null}
              {pack?.ad?.urgency || briefing?.urgencyOffer ? (
                <p className="small mt-2 mb-0 text-danger">
                  <strong>Urgência:</strong> {pack?.ad?.urgency || briefing?.urgencyOffer}
                </p>
              ) : null}
            </CardBody>
          </Card>
          {Array.isArray(pack?.metaAdsChecklist) && pack.metaAdsChecklist.length > 0
            ? copyBlock('Checklist Gerenciador de Anúncios', pack.metaAdsChecklist)
            : null}
          <Card className="lm-card-soft mb-3">
            <CardBody>
              <CardTitle tag="h6" className="text-primary">
                Público (rascunho)
              </CardTitle>
              <p className="small text-muted mb-0">
                {pack.audienceDraft?.age} · {pack.audienceDraft?.geoText}
              </p>
              <p className="small mb-0 mt-2">
                <strong>Interesses:</strong> {(pack.audienceDraft?.interests || []).join(', ')}
              </p>
            </CardBody>
          </Card>
        </Col>
        <Col lg={7}>
          <h6 className="text-primary mb-3">Textos gerados pela IA (perguntas 19–21)</h6>
          {copyBlock('19. Texto principal (primary text)', pack.adCopy?.primaryTexts || pack.primaryTexts, true)}
          {copyBlock('20. Título do anúncio (headline)', pack.adCopy?.headlines || pack.headlines, true)}
          {copyBlock('21. Descrição (texto secundário)', pack.adCopy?.descriptions || pack.descriptions, true)}
          {copyBlock('CTA', pack.ctas)}
          {copyBlock(
            'Legendas de link',
            pack.creativeSuggestions?.linkCaptionSuggestions || pack.linkCaptionSuggestions
          )}
          {copyBlock('Ideias de imagem / carrossel', pack.creativeSuggestions?.imageIdeas || pack.imageIdeas, true)}
          {copyBlock(
            'Roteiro — vídeo 9:16 (Reels / Stories)',
            pack.creativeSuggestions?.videoScript || pack.videoScript,
            true
          )}
          <Card className="lm-card-soft">
            <CardBody>
              <CardTitle tag="h6" className="text-primary">
                Follow-up WhatsApp
                <Badge color="success" className="ms-2 fw-normal">
                  IA
                </Badge>
              </CardTitle>
              <pre
                className="small bg-light p-3 rounded border mb-3"
                style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
              >
                {pack.adCopy?.whatsappFollowup || pack.whatsappFollowup}
              </pre>
              {briefing?.instagramListingUrl ? (
                <p className="small text-muted mb-0">
                  Criativos: {pack?.ad?.creativeAssets || briefing?.creativeAssets}
                  <br />
                  Referência:{' '}
                  <a href={briefing.instagramListingUrl} target="_blank" rel="noopener noreferrer">
                    {briefing.instagramListingUrl}
                  </a>
                </p>
              ) : null}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
