/* eslint-disable react/prop-types -- small presentational component */
import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import Badge from './Badge';

function ChartTooltip({ active, payload, format }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="d-chart-tip">
      <span>{point.label}</span>
      <strong>{format(point.value)}</strong>
    </div>
  );
}

/**
 * data: [{ label, value }]
 * floats: [{ label, value, delta, invertGood }] — mini cards over the chart
 * status: { tone: 'good' | 'warn', label }
 */
function TrendCard({
  title,
  status,
  periods,
  period,
  onPeriodChange,
  floats = [],
  data,
  formatValue = String,
  emptyText,
  index = 0,
}) {
  const gradientId = `trend-${useId().replace(/:/g, '')}`;

  return (
    <section className="d-card d-trend d-span-2" style={{ '--i': index }}>
      <div className="d-card-head">
        <div className="d-title-row">
          <h2 className="d-card-title">{title}</h2>
          {status && (
            <span className={`d-status d-status-${status.tone}`}>
              <span className="d-status-dot" aria-hidden="true" />
              {status.label}
            </span>
          )}
        </div>
        {periods && (
          <label className="d-select">
            <span className="sr-only">Period</span>
            <select value={period} onChange={(e) => onPeriodChange(e.target.value)}>
              {periods.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
          </label>
        )}
      </div>

      <div className="d-trend-body">
        {floats.length > 0 && (
          <div className="d-floats">
            {floats.map((f) => (
              <div key={f.label} className="d-float">
                <span className="d-micro">{f.label}</span>
                <div className="d-float-row">
                  <strong>{f.value}</strong>
                  {f.delta !== null && f.delta !== undefined && (
                    <Badge value={f.delta} invertGood={f.invertGood} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {data.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 56, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef5a5f" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#ef5a5f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={['dataMin - 8', 'dataMax + 4']} />
              <Tooltip
                content={<ChartTooltip format={formatValue} />}
                cursor={{ stroke: 'var(--accent-300)', strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--accent-700)"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                isAnimationActive={false}
                activeDot={{ r: 4, fill: 'var(--accent-700)', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="d-empty">{emptyText}</p>
        )}
      </div>
    </section>
  );
}

export default TrendCard;
