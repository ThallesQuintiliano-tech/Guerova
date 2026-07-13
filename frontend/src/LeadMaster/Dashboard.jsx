import { useMemo, useState } from 'react';
import { Row, Col } from 'reactstrap';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import BrazilSalesMap from './BrazilSalesMap';
import { biMentoradosRanking, biMentoradosProspecting } from './biMentoradosData';
import {
  biSalesGoal,
  biKpis,
  biFunnel,
  biFunnelTotalConversion,
  biStateSalesRevenue,
  biMonthlySalesTraffic,
  biPropertyTypes,
  biLeadSources,
  biTrafficTop15,
  biTrafficSummary,
  MAP_COLORS,
  formatBRL,
  formatBRLDot,
} from './biDashboardData';
import './bi-dashboard.scss';

const PERIODS = ['Jan–Jun 2025', 'Jan–Dez 2024', 'Últimos 12 meses'];
const STATES_FILTER = ['Todos', 'SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'PE', 'GO', 'BA'];
const LEVELS = ['Todos', 'A', 'B', 'C', 'D'];

function FunnelStep({ step, maxCount, isLast }) {
  const widthPct = Math.max(22, (step.count / maxCount) * 100);
  const convLabel =
    step.stage === 'Impressões (Alcance)'
      ? `100% ${step.totalConv.toFixed(1)}%`
      : `${step.stepConv}% conv. ${step.totalConv < 1 ? step.totalConv.toFixed(1) : step.totalConv}%`;

  return (
    <div className="four-bi-funnel-step">
      <div className="four-bi-funnel-bar-wrap" style={{ width: `${widthPct}%` }}>
        <div className="four-bi-funnel-bar">
          <div className="count">{step.count.toLocaleString('pt-BR')}</div>
          <div className="stage">{step.stage}</div>
          <div className="conv">{convLabel}</div>
        </div>
      </div>
      {!isLast && <div className="four-bi-funnel-arrow">▼</div>}
    </div>
  );
}

function DonutPanel({ title, data }) {
  return (
    <div className="four-bi-panel four-bi-panel--compact">
      <h3 className="four-bi-panel-title">{title}</h3>
      <div className="four-bi-donut-row">
        <div className="four-bi-donut-chart">
          <ResponsiveContainer width={130} height={130}>
            <PieChart>
              <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={2} stroke="none">
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="four-bi-donut-legend">
          {data.map((d) => (
            <li key={d.name}>
              <span>
                <span className="four-bi-legend-dot" style={{ background: d.color, marginRight: 6 }} />
                {d.name}
              </span>
              <strong>{d.value}%</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [period, setPeriod] = useState(PERIODS[0]);
  const [stateFilter, setStateFilter] = useState('Todos');
  const [levelFilter, setLevelFilter] = useState('Todos');
  const [rankingTab, setRankingTab] = useState('top20');

  const maxFunnel = biFunnel[0].count;

  const filteredRanking = useMemo(() => {
    let rows = biMentoradosRanking;
    if (stateFilter !== 'Todos') rows = rows.filter((r) => r.state === stateFilter);
    if (levelFilter !== 'Todos') rows = rows.filter((r) => r.level === levelFilter);
    return rows;
  }, [stateFilter, levelFilter]);

  const chartRows = useMemo(() => {
    if (rankingTab === 'top20') {
      return filteredRanking
        .filter((r) => r.profit)
        .slice(0, 20)
        .map((r) => ({ name: r.name, value: r.profit, label: formatBRLDot(r.profit) }));
    }
    if (rankingTab === 'semVenda') {
      return filteredRanking
        .filter((r) => !r.profit)
        .map((r) => ({ name: r.name, value: 1, label: 'Sem venda', isEmpty: true }));
    }
    return filteredRanking.map((r) => ({
      name: r.name,
      value: r.profit || 1,
      label: r.profit ? formatBRLDot(r.profit) : 'Sem venda',
      isEmpty: !r.profit,
    }));
  }, [filteredRanking, rankingTab]);

  const tableRows = useMemo(() => {
    if (rankingTab === 'top20') return filteredRanking.filter((r) => r.profit).slice(0, 20);
    if (rankingTab === 'semVenda') return filteredRanking.filter((r) => !r.profit);
    return filteredRanking;
  }, [filteredRanking, rankingTab]);

  const chartHeight = Math.min(Math.max(chartRows.length * 22, 200), rankingTab === 'all' ? 520 : 400);

  return (
    <div className="four-bi-dashboard">
      <div className="four-bi-header">
        <h1>Four Assessoria — Real Estate BI Dashboard</h1>
      </div>

      <div className="four-bi-filters">
        <div>
          <label htmlFor="four-bi-period">Filtros</label>
          <select id="four-bi-period" value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="four-bi-state">Estado</label>
          <select id="four-bi-state" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            {STATES_FILTER.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="four-bi-level">Nível</label>
          <select id="four-bi-level" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="four-bi-goal">
        <Row className="align-items-center g-3">
          <Col md={4}>
            <div className="four-bi-goal-label">Meta de Vendas — {biSalesGoal.year}</div>
            <div className="d-flex align-items-end gap-2">
              <span className="four-bi-goal-pct">{biSalesGoal.pct}%</span>
              <span className="four-bi-goal-sub mb-1">da meta atingida</span>
            </div>
          </Col>
          <Col md={5}>
            <div className="four-bi-progress-track">
              <div className="four-bi-progress-fill" style={{ width: `${biSalesGoal.pct}%` }} />
            </div>
            <div className="four-bi-progress-labels">
              <span>R$ 0</span>
              <span>R$ 2,5M</span>
              <span>R$ 5M</span>
              <span>R$ 7,5M</span>
              <span>R$ 10M</span>
            </div>
          </Col>
          <Col md={3}>
            <div className="four-bi-goal-right">
              <div className="realizado">Realizado {formatBRLDot(biSalesGoal.achieved)}</div>
              <div className="text-white-50 small">Meta total: {formatBRLDot(biSalesGoal.target)}</div>
              <div className="delta">↑ +{biSalesGoal.deltaPct}% vs mês ant.</div>
            </div>
          </Col>
        </Row>
      </div>

      <div className="four-bi-kpis">
        {biKpis.map((k) => (
          <div key={k.id} className="four-bi-kpi">
            <div className="label">{k.label}</div>
            <div className="value">{k.value}</div>
            <div className={`delta ${k.positive === null ? 'neutral' : 'up'}`}>{k.delta}</div>
          </div>
        ))}
      </div>

      <Row className="g-3 mb-3">
        <Col lg={4}>
          <div className="four-bi-panel four-bi-panel--stretch h-100">
            <h3 className="four-bi-panel-title">Funil de Conversão CRM</h3>
            <div className="four-bi-funnel">
              {biFunnel.map((step, i) => (
                <FunnelStep key={step.stage} step={step} maxCount={maxFunnel} isLast={i === biFunnel.length - 1} />
              ))}
            </div>
            <div className="four-bi-funnel-footer">
              Conversão total: <strong>{biFunnelTotalConversion}%</strong> · Período: Jan–Jun 2025
            </div>
          </div>
        </Col>
        <Col lg={4}>
          <div className="four-bi-panel four-bi-panel--stretch h-100">
            <h3 className="four-bi-panel-title">Distribuição Geográfica de Vendas Brasil</h3>
            <div className="four-bi-legend">
              <span>
                <span className="four-bi-legend-dot" style={{ background: MAP_COLORS.high }} />
                Alto Volume (&gt;15 vendas)
              </span>
              <span>
                <span className="four-bi-legend-dot" style={{ background: MAP_COLORS.medium }} />
                Médio (8–15)
              </span>
              <span>
                <span className="four-bi-legend-dot" style={{ background: MAP_COLORS.low }} />
                Baixo (&lt;8)
              </span>
            </div>
            <BrazilSalesMap />
          </div>
        </Col>
        <Col lg={4}>
          <div className="four-bi-panel four-bi-panel--stretch h-100">
            <h3 className="four-bi-panel-title">Vendas Mensais × Tráfego Pago 2025</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer>
                <ComposedChart data={biMonthlySalesTraffic} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tickFormatter={(v) => formatBRL(v, true)} tick={{ fontSize: 10 }} width={42} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10 }}
                    width={42}
                  />
                  <Tooltip
                    formatter={(value, name) =>
                      name === 'trafego' ? [formatBRL(value), 'Tráfego pago'] : [formatBRL(value), 'Vendas']
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="vendas" name="Vendas" fill="#4f46e5" radius={[3, 3, 0, 0]} barSize={18} />
                  <Line yAxisId="right" type="monotone" dataKey="trafego" name="Tráfego pago" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>
      </Row>

      <Row className="g-3 mb-3 align-items-start">
        <Col md={6}>
          <DonutPanel title="Tipologia dos Imóveis" data={biPropertyTypes} />
        </Col>
        <Col md={6}>
          <DonutPanel title="Origem do Lead" data={biLeadSources} />
        </Col>
      </Row>

      <div className="four-bi-panel mb-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
          <h3 className="four-bi-panel-title mb-0">
            Ranking de Mentorados <span style={{ fontWeight: 400, color: '#64748b' }}>250 Mentorados</span>
          </h3>
          <div className="four-bi-tabs">
            <button type="button" className={rankingTab === 'all' ? 'active' : ''} onClick={() => setRankingTab('all')}>
              Todos (250)
            </button>
            <button type="button" className={rankingTab === 'top20' ? 'active' : ''} onClick={() => setRankingTab('top20')}>
              Top 20
            </button>
            <button type="button" className={rankingTab === 'semVenda' ? 'active' : ''} onClick={() => setRankingTab('semVenda')}>
              Sem Venda
            </button>
          </div>
        </div>

        <div className="four-bi-chart-scroll" style={{ maxHeight: 520 }}>
          <div style={{ height: chartHeight, minWidth: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} layout="vertical" margin={{ left: 4, right: 48, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" hide domain={[0, 'dataMax']} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9 }} interval={0} />
                <Tooltip
                  formatter={(_, __, props) => [props.payload.label, 'Lucro']}
                  labelFormatter={(l) => l}
                />
                <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={rankingTab === 'all' ? 10 : 14}>
                  {chartRows.map((entry, i) => (
                    <Cell key={i} fill={entry.isEmpty ? '#cbd5e1' : '#2563eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="four-bi-table-wrap">
          <table className="four-bi-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Mentorado</th>
                <th>Nível</th>
                <th>Estado</th>
                <th>Imóvel Comprado (R$)</th>
                <th>Imóvel Vendido (R$)</th>
                <th>Lucro Bruto</th>
                <th>Tráfego Gasto</th>
                <th>ROI</th>
                <th>Desempenho</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.rank}>
                  <td>{r.rank}</td>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>
                    <span className="four-bi-level">{r.level}</span>
                  </td>
                  <td>{r.state}</td>
                  <td>{formatBRLDot(r.bought)}</td>
                  <td>{r.sold ? formatBRLDot(r.sold) : 'Em negociação'}</td>
                  <td style={{ color: r.profit ? '#16a34a' : undefined, fontWeight: r.profit ? 600 : 400 }}>
                    {r.profit ? formatBRLDot(r.profit) : '—'}
                  </td>
                  <td>{formatBRLDot(r.traffic)}</td>
                  <td>{r.roi != null ? `${r.roi}x` : '—'}</td>
                  <td>{r.profit ? '★' : r.sold ? '🔄' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="four-bi-panel mb-3">
        <h3 className="four-bi-panel-title">Mentorados em Prospecção</h3>
        <div className="four-bi-table-wrap" style={{ maxHeight: 360 }}>
          <table className="four-bi-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Mentorado</th>
                <th>Estado</th>
                <th>Imóvel Comprado (R$)</th>
                <th>Tráfego Gasto</th>
                <th>Leads Gerados</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {biMentoradosProspecting.map((r) => (
                <tr key={r.rank}>
                  <td>{r.rank}</td>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>{r.state}</td>
                  <td>{formatBRLDot(r.bought)}</td>
                  <td>{formatBRLDot(r.traffic)}</td>
                  <td>{r.leads}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Row className="g-3">
        <Col lg={7}>
          <div className="four-bi-panel h-100">
            <h3 className="four-bi-panel-title">Tráfego Pago — Meta Ads</h3>

            <div className="four-bi-traffic-hero">
              <div className="four-bi-traffic-hero__stats">
                <div className="four-bi-traffic-stat four-bi-traffic-stat--spend">
                  <span className="four-bi-traffic-stat__label">Total gasto</span>
                  <span className="four-bi-traffic-stat__value">{formatBRLDot(biTrafficSummary.totalSpend)}</span>
                  <span className="four-bi-traffic-stat__hint">Investimento em anúncios no período</span>
                </div>
                <div className="four-bi-traffic-stat four-bi-traffic-stat--revenue">
                  <span className="four-bi-traffic-stat__label">Receita gerada</span>
                  <span className="four-bi-traffic-stat__value">{formatBRLDot(biTrafficSummary.totalRevenue)}</span>
                  <span className="four-bi-traffic-stat__hint">Vendas atribuídas ao tráfego pago</span>
                </div>
              </div>
              <div className="four-bi-traffic-roi">
                ROI{' '}
                <strong>
                  {(biTrafficSummary.totalRevenue / biTrafficSummary.totalSpend).toFixed(1).replace('.', ',')}x
                </strong>{' '}
                · cada R$1 investido gerou{' '}
                <strong>
                  R${Math.round(biTrafficSummary.totalRevenue / biTrafficSummary.totalSpend).toLocaleString('pt-BR')}
                </strong>{' '}
                em receita
              </div>
            </div>

            <div className="four-bi-traffic-summary-chart">
              <div className="four-bi-traffic-summary-chart__title">Gasto × Receita por mês</div>
              <div style={{ height: 240 }}>
                <ResponsiveContainer>
                  <ComposedChart data={biMonthlySalesTraffic} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 600 }} />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(v) => formatBRL(v, true)}
                      tick={{ fontSize: 11 }}
                      width={48}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(v) => formatBRL(v, true)}
                      tick={{ fontSize: 11 }}
                      width={48}
                    />
                    <Tooltip
                      formatter={(value, name) =>
                        name === 'Gasto (tráfego)' ? [formatBRL(value), name] : [formatBRL(value), name]
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                    <Bar
                      yAxisId="left"
                      dataKey="trafego"
                      name="Gasto (tráfego)"
                      fill="#1877f2"
                      radius={[4, 4, 0, 0]}
                      barSize={28}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="vendas"
                      name="Receita gerada"
                      stroke="#16a34a"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#16a34a', strokeWidth: 2, stroke: '#fff' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <h4 className="four-bi-subtitle">Por mentorado (Top 15)</h4>
            <div style={{ height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={biTrafficTop15} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => formatBRL(v)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => formatBRL(v)} />
                  <Bar dataKey="spend" name="Gasto" fill="#1877f2" radius={[0, 3, 3, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="four-bi-table mt-2">
              <thead>
                <tr>
                  <th>Mentorado</th>
                  <th>Gasto</th>
                  <th>Receita</th>
                  <th>ROI</th>
                </tr>
              </thead>
              <tbody>
                {biTrafficTop15.map((r) => (
                  <tr key={r.name}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td>{formatBRLDot(r.spend)}</td>
                    <td>{r.revenue ? formatBRLDot(r.revenue) : '—'}</td>
                    <td>{r.roi != null ? `${r.roi}x` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Col>
        <Col lg={5}>
          <div className="four-bi-panel h-100">
            <h3 className="four-bi-panel-title">Vendas por Estado UF</h3>
            <div className="four-bi-states-grid">
              {biStateSalesRevenue.map((s) => (
                <div key={s.uf} className="state-item">
                  <div className="uf">{s.uf}</div>
                  <div className="val">{formatBRLDot(s.sales)}</div>
                </div>
              ))}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
