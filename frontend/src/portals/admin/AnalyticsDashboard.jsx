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
import { Card, Empty, Loading, PageHeader, RiskBadge } from '../../components/ui';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

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

  if (loading) return <Loading />;
  if (!data) return <Empty title="No analytics available yet" />;

  const totals = data.campaigns.reduce(
    (acc, c) => ({ sent: acc.sent + c.totalAttempts, clicked: acc.clicked + c.clicked }),
    { sent: 0, clicked: 0 },
  );
  const scoredEmployees = data.departments.reduce((sum, d) => sum + d.employeeCount, 0);

  // Spread the two end labels apart when the lines finish close together.
  const last = data.trend[data.trend.length - 1] || {};
  const endsClose =
    last.avgRisk !== null &&
    last.clickRate !== null &&
    Math.abs(last.avgRisk - last.clickRate) < 0.1;
  const labelOffset = (i) => (endsClose ? (i === 0 ? -8 : 8) : 0);

  return (
    <div className="stack">
      <PageHeader title="Dashboard" subtitle="Your organization's security posture at a glance." />

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-label">Org risk score (weighted)</span>
          <span className="stat-value">{asPercent(data.riskScore)}</span>
          <span>
            <RiskBadge level={data.riskLevel} />
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Employees scored</span>
          <span className="stat-value">{scoredEmployees}</span>
          <span className="stat-sub">across {plural(data.departments.length, 'department')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Overall click rate</span>
          <span className="stat-value">
            {totals.sent ? asPercent(totals.clicked / totals.sent) : '—'}
          </span>
          <span className="stat-sub">
            {plural(totals.clicked, 'click')} from {plural(data.campaigns.length, 'campaign')}
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

      <Card title="Trend by week" subtitle="Average risk score and click rate over time.">
        {data.trend.length === 0 ? (
          <Empty title="No history yet">
            Trends appear once scores are computed and campaigns sent.
          </Empty>
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
      </Card>

      <Card title="Risk by department" subtitle="Average latest risk score per department.">
        {data.departments.length === 0 ? (
          <Empty title="No scored employees yet">
            Compute scores from the Employees page first.
          </Empty>
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
                tick={axisTick}
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
      </Card>

      <Card title="Campaign funnel" className="card-flush">
        {data.campaigns.length === 0 ? (
          <Empty title="No campaigns yet" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th className="num">Targeted</th>
                  <th className="num">Opened</th>
                  <th className="num">Clicked</th>
                  <th className="num">Submitted</th>
                  <th className="num">Reported</th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="cell-main">{c.name}</td>
                    <td className="num">{c.totalAttempts}</td>
                    <td className="num">{c.opened}</td>
                    <td className="num">{c.clicked}</td>
                    <td className="num">{c.submitted}</td>
                    <td className="num">{c.reported}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AnalyticsDashboard;
