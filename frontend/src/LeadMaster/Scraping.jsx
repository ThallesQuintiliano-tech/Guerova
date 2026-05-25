import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Row, Col, Card, CardBody, CardTitle, Label, Input, Button, Table, Alert, Spinner } from 'reactstrap';
import { Link } from 'react-router-dom';
import DataTable from 'react-data-table-component';
import { scrapingSectors } from './mockData';
import CityStatePicker from './CityStatePicker';
import { validateCityField } from './cityField';

function downloadCsv(columns, rows, filename) {
  const sep = ';';
  const esc = (v) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };
  const header = columns.map((c) => esc(c.label)).join(sep);
  const lines = rows.map((row) => columns.map((c) => esc(row[c.key])).join(sep));
  const bom = '\uFEFF';
  const blob = new Blob([bom + [header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const tableCustomStyles = {
  headCells: {
    style: {
      fontSize: '0.75rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.02em',
      backgroundColor: '#f1f5f9',
      color: '#475569',
    },
  },
  cells: {
    style: {
      fontSize: '0.8125rem',
    },
  },
  pagination: {
    style: {
      fontSize: '0.8125rem',
      borderTop: '1px solid #e2e8f0',
    },
  },
};

export default function Scraping() {
  const [source, setSource] = useState('osm');
  const [sectorId, setSectorId] = useState(scrapingSectors?.[0]?.id || 'imoveis');
  const [city, setCity] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState('');
  const leadsSectionRef = useRef(null);

  useEffect(() => {
    if (preview && !loading) {
      leadsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [preview, loading]);

  const runScrape = useCallback(async () => {
    setLoading(true);
    setPreview(null);
    setJobId(null);
    setError(null);
    setFilterText('');

    const cityCheck = validateCityField(city);
    if (!cityCheck.ok) {
      setError(cityCheck.message);
      setLoading(false);
      return;
    }

    try {
      const r = await fetch('/api/scraping/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ source, sectorId, city: city.trim(), quantity }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        throw new Error(j?.error || `Falha no scraping (HTTP ${r.status})`);
      }
      setPreview(j.preview);
      setJobId(j.preview?.jobId ?? `real-${Date.now().toString(36)}`);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [source, sectorId, city, quantity]);

  const filteredRows = useMemo(() => {
    if (!preview?.rows) return [];
    const q = filterText.trim().toLowerCase();
    if (!q) return preview.rows;
    return preview.rows.filter((row) =>
      preview.columns.some((c) => String(row[c.key] ?? '').toLowerCase().includes(q))
    );
  }, [preview, filterText]);

  const dataTableColumns = useMemo(() => {
    if (!preview?.columns) return [];
    return preview.columns.map((c) => {
      const base = {
        name: c.label,
        selector: (row) => row[c.key],
        sortable: true,
        wrap: true,
        grow: c.key === 'urlOrigem' || c.key === 'empresa' ? 1.5 : 0,
        minWidth: c.key === 'urlOrigem' ? '240px' : c.key === 'id' ? '120px' : undefined,
      };
      if (c.key === 'urlOrigem') {
        return {
          ...base,
          cell: (row) => (
            <a href={row.urlOrigem} target="_blank" rel="noopener noreferrer" className="text-break small">
              {row.urlOrigem}
            </a>
          ),
        };
      }
      if (c.key === 'site' || c.key === 'email') {
        return {
          ...base,
          cell: (row) => {
            const v = row[c.key];
            if (c.key === 'site' && v && String(v).startsWith('http')) {
              return (
                <a href={v} target="_blank" rel="noopener noreferrer" className="text-break small">
                  {v}
                </a>
              );
            }
            return <span className="text-break">{v}</span>;
          },
        };
      }
      return base;
    });
  }, [preview]);

  const onExportCsv = () => {
    if (!preview) return;
    const safe = String(preview.sectorLabel || 'segmento').replace(/\s+/g, '-').toLowerCase();
    downloadCsv(preview.columns, filteredRows, `scraping-internet-real-${safe}-${filteredRows.length}registros.csv`);
  };

  const sector = useMemo(
    () => scrapingSectors.find((s) => s.id === sectorId) || scrapingSectors[0],
    [sectorId]
  );

  return (
    <div className="p-4">
      <h2 className="h4 mb-1">Scraping — dados reais</h2>
      <p className="text-muted small mb-4">
        Selecione a fonte, o segmento e a cidade. OpenStreetMap funciona sem chave. Google Places usa a API
        oficial (precisa de <code>GOOGLE_MAPS_API_KEY</code> no backend).
      </p>

      <Alert color="light" className="border mb-4 small">
        Fluxo principal:{' '}
        <Link to="/leadmaster/campanha/briefing">briefing → campanha com IA</Link>. Abaixo: prospecção B2B por setor.
      </Alert>

      <Row className="g-3">
        <Col lg={5}>
          <Card className="lm-card-soft">
            <CardBody>
              <CardTitle tag="h6" className="mb-3">Fonte e Segmento</CardTitle>
              <div className="mb-3">
                <Label>Fonte</Label>
                <Input type="select" value={source} onChange={(e) => setSource(e.target.value)}>
                  <option value="osm">OpenStreetMap (Overpass)</option>
                  <option value="google">Google Places (API)</option>
                </Input>
                <small className="text-muted d-block mt-1">
                  Google é via API oficial (precisa <code>GOOGLE_MAPS_API_KEY</code> no backend).
                </small>
              </div>
              <div className="mb-3">
                <Label>Digite somente o segmento</Label>
                {scrapingSectors?.length ? (
                  <>
                    <Input type="select" value={sectorId} onChange={(e) => setSectorId(e.target.value)}>
                      {scrapingSectors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </Input>
                    {sector?.hint ? <small className="text-muted d-block mt-1">{sector.hint}</small> : null}
                  </>
                ) : null}
              </div>
              <div className="mb-3">
                <CityStatePicker value={city} onChange={setCity} disabled={loading} />
              </div>
              <div className="mb-3">
                <Label>Quantidade de registros</Label>
                <Input
                  type="number"
                  min={1}
                  max={40}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
                <small className="text-muted">Limite: até 40 registros.</small>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <Button color="primary" className="rounded-pill" onClick={runScrape} disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner size="sm" className="me-2" /> Buscando…
                    </>
                  ) : (
                    'Executar scraping'
                  )}
                </Button>
                {preview && (
                  <Button color="outline-secondary" type="button" onClick={onExportCsv} disabled={!filteredRows.length}>
                    Exportar CSV ({filteredRows.length})
                  </Button>
                )}
              </div>
              {error && (
                <Alert color="danger" className="small mt-3 mb-0">
                  Erro ao coletar: <code>{error}</code>
                </Alert>
              )}
              {jobId && preview && (
                <p className="small text-success mt-3 mb-0">
                  Job <code>{jobId}</code> — {preview.shown} registros indexados para <strong>{preview.sectorLabel}</strong>
                  .
                </p>
              )}
              <p className="small text-muted mt-3 mb-0">
                LGPD: em produção, valide base legal e opt-in antes de usar em campanhas ou CRM.
              </p>
            </CardBody>
          </Card>
        </Col>
        <Col lg={7}>
          <Card className="lm-card-soft">
            <CardBody>
              <CardTitle tag="h6" className="mb-3">
                O que o scraper tenta extrair
              </CardTitle>
              <Table responsive size="sm" className="mb-0 small">
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="fw-semibold">Título da página</td>
                    <td className="text-muted">Usado como “Empresa / título”.</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">E-mail</td>
                    <td className="text-muted">Links <code>mailto:</code> e texto da página.</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Telefone</td>
                    <td className="text-muted">Padrões comuns de telefone (normalizado para dígitos).</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Instagram</td>
                    <td className="text-muted">Primeiro link encontrado com <code>instagram.com</code>.</td>
                  </tr>
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Card innerRef={leadsSectionRef} className="lm-card-soft mt-4">
        <CardBody>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <CardTitle tag="h6" className="mb-0">
              Leads coletados — DataGrid{' '}
              {preview && !loading && (
                <span className="text-muted fw-normal">({filteredRows.length} linhas)</span>
              )}
            </CardTitle>
            {preview && !loading && (
              <Button size="sm" color="outline-primary" onClick={onExportCsv} disabled={!filteredRows.length}>
                Baixar CSV
              </Button>
            )}
          </div>

          {loading && (
            <div className="d-flex align-items-center gap-2 py-5 justify-content-center text-muted">
              <Spinner color="primary" />
              <span>Buscando empresas…</span>
            </div>
          )}

          {!loading && !preview && (
            <p className="text-muted small mb-0 py-4 text-center">
              Selecione o segmento e clique em <strong>Executar scraping</strong> para preencher a grade.
            </p>
          )}

          {!loading && preview && (
            <>
              <p className="small text-muted mb-3">
                Registros carregados. Ordenação, paginação e busca em todas as colunas.
              </p>
              <div className="lm-scraping-datagrid-wrap">
                <DataTable
                  key={`${preview.sectorId}-${preview.shown}-${jobId}`}
                  columns={dataTableColumns}
                  data={filteredRows}
                  pagination
                  paginationPerPage={8}
                  paginationRowsPerPageOptions={[8, 12, 20, 40]}
                  highlightOnHover
                  striped
                  dense
                  persistTableHead
                  fixedHeader
                  fixedHeaderScrollHeight="420px"
                  subHeader
                  subHeaderComponent={
                    <Input
                      type="search"
                      placeholder="Filtrar na grade (empresa, e-mail, cidade…)"
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="mb-3"
                      style={{ maxWidth: 420 }}
                    />
                  }
                  customStyles={tableCustomStyles}
                  responsive
                />
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Card className="lm-card-soft mt-4">
        <CardBody>
          <CardTitle tag="h6" className="mb-3">
            Observações
          </CardTitle>
          <ul className="small ps-3 mb-0">
            <li className="mb-2">Alguns sites bloqueiam scraping (Cloudflare, bot protection) e podem dar erro/timeout.</li>
            <li className="mb-2">Prefira páginas públicas e de contato/sobre.</li>
            <li className="mb-2">Respeite LGPD/termos do site antes de usar os dados.</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
