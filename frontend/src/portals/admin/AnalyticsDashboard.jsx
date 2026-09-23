import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getOrganizationAnalytics } from '../../api/analytics';

const asPercent = (value) =>
  value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`;

// Categorical slots 1–2 of the dataviz reference palette (validated for CVD separation).
const TREND_SERIES = [
  { key: 'avgRisk', name: 'Avg risk score', color: '#2a78d6' },
  { key: 'clickRate', name: 'Click rate', color: '#eb6834' },
];

const axisTick = { fill: '#898781', fontSize: 12 };

/* eslint-disable react/prop-types -- recharts label props */
function EndLabel({ x, y, index, value, name, lastIndex, dy }) {
  if (index !== lastIndex || value === null || value === undefined) return null;
  return (
    <text x={x + 8} y={y + 4 + dy} fill="#52514e" fontSize={12}>
      {name} {asPercent(value)}
    </text>
  );
}
/* eslint-enable react/prop-types */

function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrganizationAnalytics()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;
  if (!data) return <p>No analytics available yet.</p>;

  // Spread the two end labels apart when the lines finish close together.
  const last = data.trend[data.trend.length - 1] || {};
  const endsClose =
    last.avgRisk !== null &&
    last.clickRate !== null &&
    Math.abs(last.avgRisk - last.clickRate) < 0.1;
  const labelOffset = (i) => (endsClose ? (i === 0 ? -8 : 8) : 0);

  return (
    <section>
      <h2>Organization analytics</h2>
      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-label">Org risk score (weighted)</span>
          <span className="stat-value">{asPercent(data.riskScore)}</span>
          <span className="stat-sub">
            {data.riskLevel ? `${data.riskLevel} risk` : 'no scores computed yet'}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Training completion</span>
          <span className="stat-value">{asPercent(data.training.completionRate)}</span>
          <span className="stat-sub">
            {data.training.completedAssignments}/{data.training.totalAssignments} assignments
          </span>
        </div>
      </div>

      <h3>Trend by week</h3>
      {data.trend.length === 0 ? (
        <p>No history yet — trends appear once scores are computed and campaigns sent.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.trend} margin={{ top: 16, right: 150, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e1e0d9" vertical={false} />
            <XAxis
              dataKey="week"
              tick={axisTick}
              axisLine={{ stroke: '#c3c2b7' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={asPercent}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              formatter={(value) => asPercent(value)}
              labelFormatter={(week) => `Week of ${week}`}
              contentStyle={{ fontSize: 13 }}
              cursor={{ stroke: '#c3c2b7', strokeWidth: 1 }}
            />
            <Legend
              verticalAlign="top"
              align="left"
              height={28}
              iconType="plainline"
              formatter={(name) => <span style={{ color: '#52514e' }}>{name}</span>}
              wrapperStyle={{ fontSize: 12 }}
            />
            {TREND_SERIES.map((series, i) => (
              <Line
                key={series.key}
                dataKey={series.key}
                name={series.name}
                stroke={series.color}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, fill: '#fcfcfb' }}
                activeDot={{ r: 5 }}
                connectNulls
                isAnimationActive={false}
              >
                <LabelList
                  dataKey={series.key}
                  content={(props) => (
                    <EndLabel
                      {...props}
                      name={series.name}
                      lastIndex={data.trend.length - 1}
                      dy={labelOffset(i)}
                    />
                  )}
                />
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      <h3>Risk by department</h3>
      {data.departments.length === 0 ? (
        <p>No scored employees yet — compute a score from the employee roster first.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.departments} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e1e0d9" vertical={false} />
            <XAxis
              dataKey="department"
              tick={axisTick}
              axisLine={{ stroke: '#c3c2b7' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={asPercent}
              tick={{ fill: '#898781', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              formatter={(value) => asPercent(value)}
              contentStyle={{ fontSize: 13 }}
              cursor={{ fill: 'rgba(11, 11, 11, 0.04)' }}
            />
            <Bar dataKey="avgScore" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={56}>
              <LabelList
                dataKey="avgScore"
                position="top"
                formatter={asPercent}
                style={{ fill: '#52514e', fontSize: 12 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      <h3>Campaign funnel</h3>
      {data.campaigns.length === 0 ? (
        <p>No campaigns yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Sent</th>
              <th>Opened</th>
              <th>Clicked</th>
              <th>Submitted</th>
              <th>Reported</th>
            </tr>
          </thead>
          <tbody>
            {data.campaigns.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.totalAttempts}</td>
                <td>{c.opened}</td>
                <td>{c.clicked}</td>
                <td>{c.submitted}</td>
                <td>{c.reported}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default AnalyticsDashboard;
