/* eslint-disable react/prop-types -- chart primitives receive recharts render props */
import { useId } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const BRAND = 'var(--brand-700)';
const MUTED_TICK = { fill: 'var(--text-muted)', fontSize: 11 };

// Dark tooltip with a small pointer, shared by every chart.
export function ChartTooltip({ active, payload, label, format = String, labelFormat = String }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const value =
    point.max !== undefined
      ? `${format(point.min)} – ${format(point.max)}`
      : format(payload[0].value);
  return (
    <div className="relative rounded-md bg-tooltip px-2.5 py-1.5 text-xs text-white shadow-pop">
      <div className="text-white-70">{labelFormat(point.label ?? label)}</div>
      <div className="font-semibold">{value}</div>
      <span
        className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-tooltip"
        aria-hidden="true"
      />
    </div>
  );
}

const textWidth = (text) => String(text).length * 6.6 + 16;

// White bubble above the highlighted point (the "200" bubble in the reference).
function Bubble({ cx, cy, text }) {
  const w = textWidth(text);
  return (
    <g style={{ filter: 'var(--drop-soft)' }}>
      <rect
        x={cx - w / 2}
        y={cy - 32}
        width={w}
        height={20}
        rx={6}
        fill="var(--bg-card)"
        stroke="var(--border)"
      />
      <text
        x={cx}
        y={cy - 18}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill="var(--text-primary)"
      >
        {text}
      </text>
    </g>
  );
}

// Dark pin tooltip on a peak.
function Pin({ cx, cy, text }) {
  const w = textWidth(text);
  return (
    <g>
      <rect x={cx - w / 2} y={cy - 34} width={w} height={22} rx={6} fill="var(--tooltip-dark)" />
      <path
        d={`M${cx - 5} ${cy - 12.5} L${cx} ${cy - 7} L${cx + 5} ${cy - 12.5} Z`}
        fill="var(--tooltip-dark)"
      />
      <text
        x={cx}
        y={cy - 19}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="var(--white)"
      >
        {text}
      </text>
    </g>
  );
}

const indexOfMax = (values) => values.reduce((best, v, i) => (v > values[best] ? i : best), 0);

/**
 * Minimal line: no axes or grid, ONE highlighted dot with a bubble, optional dark pins.
 * highlight: 'last' | 'max' | index. pins: indices that get a dark pin label.
 */
export function Sparkline({
  data,
  highlight = 'last',
  pins = [],
  format = String,
  height = 64,
  bubble = true,
  label,
}) {
  if (!data || data.length < 2) return <div style={{ height }} aria-hidden="true" />;
  const points = data.map((value, i) => ({ i, value }));
  const hi =
    highlight === 'max' ? indexOfMax(data) : highlight === 'last' ? data.length - 1 : highlight;
  const top = bubble || pins.length ? 34 : 6;

  function renderDot({ cx, cy, index }) {
    if (index === hi || pins.includes(index)) {
      return (
        <g key={`dot-${index}`}>
          {pins.includes(index) ? (
            <Pin cx={cx} cy={cy} text={format(data[index])} />
          ) : (
            bubble && <Bubble cx={cx} cy={cy} text={format(data[index])} />
          )}
          <circle cx={cx} cy={cy} r={4.5} fill="var(--bg-card)" stroke={BRAND} strokeWidth={2} />
        </g>
      );
    }
    return <g key={`dot-${index}`} />;
  }

  return (
    <div
      role="img"
      aria-label={label || `Trend: ${data.map(format).join(', ')}`}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top, right: 18, bottom: 6, left: 18 }}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={BRAND}
            strokeWidth={2}
            dot={renderDot}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Brand area chart: 2px line, soft gradient, hover dot only.
export function AreaTrend({
  data,
  height = 220,
  format = String,
  showXAxis = true,
  showYAxis = false,
  label,
}) {
  const id = `area-${useId().replace(/:/g, '')}`;
  return (
    <div role="img" aria-label={label} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: showYAxis ? 0 : 8 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND} stopOpacity="var(--chart-fill-opacity)" />
              <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            hide={!showXAxis}
            tick={MUTED_TICK}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            minTickGap={16}
          />
          <YAxis
            hide={!showYAxis}
            tick={MUTED_TICK}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={format}
          />
          <Tooltip
            content={<ChartTooltip format={format} />}
            cursor={{ stroke: 'var(--brand-100)', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={BRAND}
            strokeWidth={2}
            fill={`url(#${id})`}
            dot={false}
            activeDot={{ r: 4.5, fill: 'var(--bg-card)', stroke: BRAND, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Thin rounded range bar with round end handles ("Sales Analytics" in the reference).
function LollipopShape({ x, y, width, height }) {
  if (height === undefined || Number.isNaN(y)) return null;
  const cx = x + width / 2;
  return (
    <g>
      <rect
        x={cx - 3}
        y={y}
        width={6}
        height={Math.max(height, 6)}
        rx={3}
        fill="var(--chart-accent)"
      />
      <circle
        cx={cx}
        cy={y}
        r={5}
        fill="var(--bg-card)"
        stroke="var(--chart-accent)"
        strokeWidth={2}
      />
      <circle
        cx={cx}
        cy={y + Math.max(height, 6)}
        r={5}
        fill="var(--bg-card)"
        stroke="var(--chart-accent)"
        strokeWidth={2}
      />
    </g>
  );
}

// data: [{ label, min, max }]
export function LollipopChart({ data, height = 240, format = String, label }) {
  const rows = data.map((d) => ({ ...d, range: [d.min, d.max] }));
  return (
    <div role="img" aria-label={label} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={MUTED_TICK}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            tick={MUTED_TICK}
            axisLine={false}
            tickLine={false}
            width={32}
            tickFormatter={format}
            domain={[0, 100]}
          />
          <Tooltip
            content={<ChartTooltip format={format} />}
            cursor={{ fill: 'var(--brand-50)' }}
          />
          <Bar dataKey="range" shape={<LollipopShape />} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Plain multi-series line chart for comparisons (e.g. click vs report rate).
export function LineTrend({ data, series, height = 220, format = String, label }) {
  return (
    <div role="img" aria-label={label} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={MUTED_TICK}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            tick={MUTED_TICK}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={format}
          />
          <Tooltip
            content={<SeriesTooltip series={series} format={format} />}
            cursor={{ stroke: 'var(--brand-100)' }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? '5 4' : undefined}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SeriesTooltip({ active, payload, label, series, format }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md bg-tooltip px-2.5 py-1.5 text-xs text-white shadow-pop">
      <div className="text-white-70">{label}</div>
      {series.map((s) => {
        const entry = payload.find((p) => p.dataKey === s.key);
        return (
          <div key={s.key} className="font-semibold">
            {s.name}: {entry ? format(entry.value) : '—'}
          </div>
        );
      })}
    </div>
  );
}
