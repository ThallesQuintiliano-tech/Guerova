import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Row, Col, Card, CardBody, CardTitle, Label, Input, Button, Table, Alert, Spinner } from 'reactstrap';
import { Link } from 'react-router-dom';
import DataTable from 'react-data-table-component';
import {
  mockScrapingGuide,
  scrapingOutputFields,
  scrapingSectors,
  buildMockScrapingPreview,
} from './mockData';

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
  const [sectorId, setSectorId] = useState('imoveis');
  const [city, setCity] = useState('São Paulo — SP');
  const [quantity, setQuantity] = useState(12);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [filterText, setFilterText] = useState('');
  const leadsSectionRef = useRef(null);

  const sector = scrapingSectors.find((s) => s.id === sectorId) || scrapingSectors[0];

  useEffect(() => {
    if (preview && !loading) {
      leadsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [preview, loading]);

  const runMockScrape = useCallback(() => {
    setLoading(true);
    setPreview(null);
    setJobId(null);
    setFilterText('');
    const id = `mock-${Date.now().toString(36)}`;
    setTimeout(() => {
      const data = buildMockScrapingPreview(sectorId, city, quantity);
      setPreview(data);
      setJobId(id);
      setLoading(false);
    }, 900);
  }, [sectorId, city, quantity]);

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
    const safe = preview.sectorLabel.replace(/\s+/g, '-').toLowerCase();
    downloadCsv(preview.columns, filteredRows, `scraping-internet-mock-${safe}-${filteredRows.length}registros.csv`);
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-1">Scraping — dados da internet (simulação)</h2>
      <p className="text-muted small mb-4">
        <strong>DataGrid</strong> com registros como se tivessem sido <strong>coletados na web</strong> (Google Maps,
        sites, redes sociais). Tudo é <strong>mock</strong> — sem chamadas reais a APIs ou sites.
      </p>

      <Alert color="light" className="border mb-4 small">
        Fluxo principal:{' '}
        <Link to="/leadmaster/campanha/briefing">briefing → campanha com IA</Link>. Abaixo: prospecção B2B por setor.
      </Alert>

      <Row className="g-3">
        <Col lg={5}>
          <Card className="lm-card-soft">
            <CardBody>
              <CardTitle tag="h6" className="mb-3">
                Configurar coleta (simulação)
              </CardTitle>
              <div className="mb-3">
                <Label>Setor</Label>
                <Input type="select" value={sectorId} onChange={(e) => setSectorId(e.target.value)}>
                  {scrapingSectors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Input>
                <small className="text-muted d-block mt-1">{sector.hint}</small>
              </div>
              <div className="mb-3">
                <Label>Cidade / região</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex.: Campinas — SP" />
              </div>
              <div className="mb-3">
                <Label>Quantidade de registros</Label>
                <Input
                  type="number"
                  min={3}
                  max={40}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
                <small className="text-muted">Até 40 linhas na grade.</small>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <Button color="primary" className="rounded-pill" onClick={runMockScrape} disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner size="sm" className="me-2" /> Coletando na web…
                    </>
                  ) : (
                    'Executar scraping (mock)'
                  )}
                </Button>
                {preview && (
                  <Button color="outline-secondary" type="button" onClick={onExportCsv} disabled={!filteredRows.length}>
                    Exportar CSV ({filteredRows.length})
                  </Button>
                )}
              </div>
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
                Campos extraídos (visão geral)
              </CardTitle>
              <Table responsive size="sm" className="mb-0 small">
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {scrapingOutputFields.map((row) => (
                    <tr key={row.field}>
                      <td className="fw-semibold">{row.field}</td>
                      <td className="text-muted">{row.description}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="fw-semibold">Origem na internet</td>
                    <td className="text-muted">Tipo de página onde o registro foi “encontrado” (mock).</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">URL capturada</td>
                    <td className="text-muted">Link simulado (Maps, site, Instagram, etc.).</td>
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
              <span>Coletando leads (simulação)…</span>
            </div>
          )}

          {!loading && !preview && (
            <p className="text-muted small mb-0 py-4 text-center">
              Clique em <strong>Executar scraping (mock)</strong> para carregar os leads abaixo nesta grade.
            </p>
          )}

          {!loading && preview && (
            <>
              <p className="small text-muted mb-3">
                Registros como se tivessem sido encontrados na web (mock). Ordenação, paginação e busca em todas as
                colunas.
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
                      placeholder="Filtrar na grade (empresa, URL, e-mail, cidade…)"
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
            Como encaixa no produto
          </CardTitle>
          <ol className="small ps-3 mb-0">
            {mockScrapingGuide.map((text, i) => (
              <li key={i} className="mb-2">
                {text}
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>
    </div>
  );
}
