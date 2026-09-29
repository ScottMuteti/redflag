/* eslint-disable react/prop-types -- small presentational component */
import { Bar, BarChart, Cell, Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';

function MiniBars({ series, highlightIndex }) {
  const data = series.map((value) => ({ value }));
  return (
    <div className="d-stat-chart d-stat-minibars">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }} barCategoryGap={3}>
          <Bar
            dataKey="value"
            radius={[3, 3, 3, 3]}
            maxBarSize={6}
            minPointSize={4}
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={i === highlightIndex ? 'var(--accent-300)' : 'var(--accent-700)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Sparkline({ series, color }) {
  const data = series.map((value) => ({ value }));
  return (
    <div className="d-stat-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 2, bottom: 6, left: 2 }}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * variant: 'bars' | 'sparkline' | 'icon' | 'highlight'
 * series: numbers for the mini chart (bars / sparkline / highlight)
 */
function StatCard({
  variant = 'icon',
  label,
  value,
  suffix,
  icon: Icon,
  series = [],
  highlightIndex,
  badge,
  index = 0,
}) {
  const hasSeries = series.length >= 2;

  return (
    <section
      className={`d-card d-stat d-stat-${variant}`}
      style={{ '--i': index }}
      aria-label={label}
    >
      {Icon && (
        <span className="d-stat-bubble" aria-hidden="true">
          <Icon size={20} strokeWidth={1.75} />
        </span>
      )}
      <div className="d-stat-text">
        <span className="d-label">{label}</span>
        <span className="d-stat-value">
          {value}
          {suffix && <small>{suffix}</small>}
          {badge}
        </span>
      </div>
      {variant === 'bars' && hasSeries && (
        <MiniBars series={series} highlightIndex={highlightIndex} />
      )}
      {variant === 'sparkline' && hasSeries && (
        <Sparkline series={series} color="var(--accent-700)" />
      )}
      {variant === 'highlight' && hasSeries && <Sparkline series={series} color="#ffffff" />}
    </section>
  );
}

export default StatCard;
