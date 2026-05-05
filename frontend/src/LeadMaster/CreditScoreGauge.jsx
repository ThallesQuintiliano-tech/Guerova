import { GAUGE_SEGMENT_COLORS, classifyCreditScore } from './scoreGaugeUtils';

const MOOD_EMOJI = {
  sad: '😞',
  neutral: '😐',
  smile: '🙂',
  great: '😄',
};

/**
 * Semicírculo com 4 segmentos; segmentos até o nível da faixa ficam coloridos, o restante em cinza.
 */
function GaugeArc({ filledSegments }) {
  const cx = 160;
  const cy = 158;
  const r = 118;
  const stroke = 22;
  const segments = 4;
  const totalDeg = 180;
  const perDeg = totalDeg / segments;

  const polarToCartesian = (angleDeg) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy - r * Math.sin(rad),
    };
  };

  const describeArc = (startAngle, endAngle) => {
    const start = polarToCartesian(startAngle);
    const end = polarToCartesian(endAngle);
    const sweep = 1;
    const largeArc = 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
  };

  const arcs = [];
  for (let i = 0; i < segments; i++) {
    const startAngle = 180 - i * perDeg;
    const endAngle = 180 - (i + 1) * perDeg;
    const active = i < filledSegments;
    const color = GAUGE_SEGMENT_COLORS[i];
    arcs.push(
      <path
        key={i}
        d={describeArc(startAngle, endAngle)}
        fill="none"
        stroke={active ? color : '#e5e7eb'}
        strokeWidth={stroke}
        strokeLinecap="round"
      />,
    );
  }

  return (
    <svg viewBox="0 0 320 175" className="lm-score-gauge__svg" aria-hidden>
      {arcs}
      {/* baseline */}
      <line x1={cx - r - 8} y1={cy} x2={cx + r + 8} y2={cy} stroke="#f1f5f9" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

export default function CreditScoreGauge({ scoreValue, riskEnum, modelLabel }) {
  const { score, tier } = classifyCreditScore(scoreValue, riskEnum);

  return (
    <div className="lm-score-gauge">
      {modelLabel ? <div className="lm-score-gauge__model small text-muted mb-2">{modelLabel}</div> : null}

      <div className="lm-score-gauge__visual">
        <GaugeArc filledSegments={tier.filledSegments} />
        <div
          className="lm-score-gauge__face"
          style={{
            backgroundColor: tier.accent,
            boxShadow: `0 8px 24px ${tier.trackMuted}`,
          }}
        >
          <span className="lm-score-gauge__face-inner">{MOOD_EMOJI[tier.mood] || MOOD_EMOJI.neutral}</span>
        </div>
      </div>

      <div className="lm-score-gauge__score-line">
        <span className="lm-score-gauge__score-num" style={{ color: tier.accent }}>
          {score}
        </span>
        <span className="lm-score-gauge__score-max text-muted"> / {1000}</span>
      </div>

      <div className="lm-score-gauge__tier-row">
        <span className="lm-score-gauge__tier-bar" style={{ backgroundColor: tier.accent }} />
        <span className="lm-score-gauge__tier-range" style={{ color: tier.accent }}>
          {tier.rangeLabel}
        </span>
      </div>

      <h4 className="lm-score-gauge__tier-label">{tier.label}</h4>
      <p className="lm-score-gauge__desc">{tier.description}</p>
    </div>
  );
}
