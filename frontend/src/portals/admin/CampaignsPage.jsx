import { Fragment, useEffect, useState } from 'react';
import { listCampaigns, listTemplates, createCampaign, launchCampaign, getCampaignResults } from '../../api/campaigns';

const emptyForm = { name: '', type: 'email', templateKey: '', difficultyLevel: 'medium' };

/* eslint-disable react/prop-types -- results is a plain array of result rows, not worth a PropTypes dependency */
function ResultsTable({ results }) {
  if (results.length === 0) return <p>No attempts recorded yet.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Employee</th>
          <th>Sent</th>
          <th>Opened</th>
          <th>Clicked</th>
          <th>Submitted credentials</th>
          <th>Reported</th>
        </tr>
      </thead>
      <tbody>
        {results.map((r) => (
          <tr key={r.employeeId}>
            <td>{r.employeeName}</td>
            <td>{r.sentAt ? '✓' : '—'}</td>
            <td>{r.openedAt ? '✓' : '—'}</td>
            <td>{r.clickedAt ? '✓' : '—'}</td>
            <td>{r.submittedCredentialsAt ? '✓' : '—'}</td>
            <td>{r.reportedAt ? '✓' : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [results, setResults] = useState([]);

  async function refresh() {
    const [camps, tmpls] = await Promise.all([listCampaigns(), listTemplates()]);
    setCampaigns(camps);
    setTemplates(tmpls);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await createCampaign(form);
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create campaign');
    }
  }

  async function handleLaunch(id) {
    setError('');
    try {
      await launchCampaign(id);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not launch campaign');
    }
  }

  async function handleViewResults(id) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    const data = await getCampaignResults(id);
    setResults(data);
    setExpandedId(id);
  }

  const templatesForType = templates.filter((t) => t.type === form.type);

  if (loading) return <p>Loading…</p>;

  return (
    <section>
      <h2>Simulation campaigns</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Difficulty</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <Fragment key={c.id}>
              <tr>
                <td>{c.name}</td>
                <td>{c.type}</td>
                <td>{c.difficultyLevel}</td>
                <td>{c.status}</td>
                <td>
                  {c.status === 'draft' && (
                    <button type="button" onClick={() => handleLaunch(c.id)}>
                      Launch
                    </button>
                  )}
                  {c.status !== 'draft' && (
                    <button type="button" onClick={() => handleViewResults(c.id)}>
                      {expandedId === c.id ? 'Hide results' : 'View results'}
                    </button>
                  )}
                </td>
              </tr>
              {expandedId === c.id && (
                <tr>
                  <td colSpan={5}>
                    <ResultsTable results={results} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      <h3>New campaign</h3>
      <form onSubmit={handleSubmit} className="employee-form">
        <input name="name" placeholder="Campaign name" value={form.name} onChange={handleChange} required />
        <select name="type" value={form.type} onChange={handleChange}>
          <option value="email">Email (Gophish)</option>
          <option value="sms">SMS (Africa&apos;s Talking)</option>
        </select>
        <select name="templateKey" value={form.templateKey} onChange={handleChange} required>
          <option value="">Select a template…</option>
          {templatesForType.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </select>
        <select name="difficultyLevel" value={form.difficultyLevel} onChange={handleChange}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        {error && <p className="error">{error}</p>}
        <button type="submit">Create draft</button>
      </form>
    </section>
  );
}

export default CampaignsPage;
