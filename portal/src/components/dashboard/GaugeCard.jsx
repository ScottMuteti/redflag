/* eslint-disable react/prop-types -- small presentational component */
import { useId } from 'react';
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import { formatPercent } from '../../lib/format';

// ratio: 0–1, or null when nothing is assigned yet.
function GaugeCard({ title, label, value, caption, ratio, index = 0 }) {
  const gradientId = `gauge-${useId().replace(/:/g, '')}`;
  const pct = ratio === null || ratio === undefined ? 0 : Math.round(ratio * 100);

  return (
    <section className="d-card d-gauge" style={{ '--i': index }}>
      <h2 className="d-card-title">{title}</h2>
      <span className="d-label">{label}</span>
      <span className="d-big">{value}</span>
      {caption && <p className="d-caption">{caption}</p>}
      <div className="d-gauge-chart">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={[{ value: pct }]}
            cx="50%"
            cy="96%"
            innerRadius={78}
            outerRadius={100}
            startAngle={180}
            endAngle={0}
            barSize={18}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f58185" />
                <stop offset="100%" stopColor="#d93a40" />
              </linearGradient>
            </defs>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={10}
              background={{ fill: 'var(--accent-100)' }}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <span className="d-gauge-value">{ratio === null ? '—' : formatPercent(pct / 100)}</span>
      </div>
    </section>
  );
}

export default GaugeCard;
