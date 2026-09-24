import { Fragment, useEffect, useState } from 'react';
import {
  listCampaigns,
  listTemplates,
  createCampaign,
  launchCampaign,
  getCampaignResults,
  customizeTemplate,
} from '../../api/campaigns';
import { Badge, Card, Empty, Field, Loading, PageHeader, StatusBadge } from '../../components/ui';

const mark = (value) => (value ? <span className="tick">✓</span> : <span className="dash">—</span>);

const emptyForm = {
  name: '',
  type: 'email',
  templateKey: '',
  difficultyLevel: 'medium',
  scheduledAt: '',
};

/* eslint-disable react/prop-types -- results is a plain array of result rows, not worth a PropTypes dependency */
function ResultsTable({ results }) {
  if (results.length === 0) return <p className="hint">No attempts recorded yet.</p>;
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
            <td className="cell-main">{r.employeeName}</td>
            <td>{mark(r.sentAt)}</td>
            <td>{mark(r.openedAt)}</td>
            <td>{mark(r.clickedAt)}</td>
            <td>{mark(r.submittedCredentialsAt)}</td>
            <td>{mark(r.reportedAt)}</td>
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
  const [draftTemplate, setDraftTemplate] = useState(null);

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
    if (e.target.name !== 'name' && e.target.name !== 'difficultyLevel') setDraftTemplate(null);
  }

  async function handleSaveTemplate() {
    setError('');
    try {
      await customizeTemplate(draftTemplate.key, {
        subject: draftTemplate.subject,
        body: draftTemplate.body,
      });
      setDraftTemplate(null);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save template');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { scheduledAt, ...rest } = form;
      await createCampaign(
        scheduledAt ? { ...rest, scheduledAt: new Date(scheduledAt).toISOString() } : rest,
      );
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
  const selectedTemplate = templates.find((t) => t.key === form.templateKey);

  if (loading) return <Loading />;

  const campaignList = (
    <Card title="All campaigns" className="card-flush">
      {campaigns.length === 0 ? (
        <Empty title="No campaigns yet">Create your first campaign above.</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Channel</th>
                <th>Difficulty</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <Fragment key={c.id}>
                  <tr>
                    <td>
                      <span className="cell-main">{c.name}</span>
                      {c.status === 'scheduled' && c.scheduledAt && (
                        <span className="cell-sub">
                          Launches {new Date(c.scheduledAt).toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td>{c.type === 'email' ? 'Email' : 'SMS'}</td>
                    <td>
                      <Badge>{c.difficultyLevel}</Badge>
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="num">
                      {(c.status === 'draft' || c.status === 'scheduled') && (
                        <button
                          type="button"
                          className="btn-sm btn-primary"
                          onClick={() => handleLaunch(c.id)}
                        >
                          {c.status === 'scheduled' ? 'Launch now' : 'Launch'}
                        </button>
                      )}
                      {c.status !== 'draft' && c.status !== 'scheduled' && (
                        <button
                          type="button"
                          className="btn-sm"
                          onClick={() => handleViewResults(c.id)}
                        >
                          {expandedId === c.id ? 'Hide results' : 'View results'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === c.id && (
                    <tr className="row-detail">
                      <td colSpan={5}>
                        <ResultsTable results={results} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );

  return (
    <div className="stack">
      <PageHeader
        title="Campaigns"
        subtitle="Run simulated email and SMS attacks and track who responds."
      />

      <div className="grid-2">
        <Card
          title="New campaign"
          subtitle="Save as a draft, or pick a time to launch automatically."
        >
          <form onSubmit={handleSubmit} className="form-grid">
            <Field label="Campaign name" wide>
              <input name="name" value={form.name} onChange={handleChange} required />
            </Field>
            <Field label="Channel">
              <select name="type" value={form.type} onChange={handleChange}>
                <option value="email">Email (Gophish)</option>
                <option value="sms">SMS (Africa&apos;s Talking)</option>
              </select>
            </Field>
            <Field label="Difficulty">
              <select name="difficultyLevel" value={form.difficultyLevel} onChange={handleChange}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </Field>
            <Field label="Template" wide>
              <select name="templateKey" value={form.templateKey} onChange={handleChange} required>
                <option value="">Select a template…</option>
                {templatesForType.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Schedule (optional)" wide>
              <input
                type="datetime-local"
                name="scheduledAt"
                value={form.scheduledAt}
                onChange={handleChange}
              />
            </Field>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {form.scheduledAt ? 'Schedule campaign' : 'Create draft'}
              </button>
              {error && <p className="error">{error}</p>}
            </div>
          </form>
        </Card>

        <Card
          title="Template preview"
          subtitle={
            selectedTemplate ? selectedTemplate.name : 'Pick a template to preview it here.'
          }
          actions={selectedTemplate?.isCustom && <Badge tone="info">Customised</Badge>}
        >
          {!selectedTemplate ? (
            <Empty title="No template selected" />
          ) : (
            <div className="template-preview">
              {draftTemplate ? (
                <>
                  {draftTemplate.type === 'email' && (
                    <input
                      value={draftTemplate.subject || ''}
                      onChange={(e) =>
                        setDraftTemplate((prev) => ({ ...prev, subject: e.target.value }))
                      }
                      placeholder="Subject"
                    />
                  )}
                  <textarea
                    rows={6}
                    value={draftTemplate.body}
                    onChange={(e) =>
                      setDraftTemplate((prev) => ({ ...prev, body: e.target.value }))
                    }
                  />
                  <p className="hint">
                    Keep the link placeholder:{' '}
                    {draftTemplate.type === 'email' ? '{{.URL}}' : '{{link}}'}
                  </p>
                  <div className="form-actions">
                    <button type="button" className="btn-primary" onClick={handleSaveTemplate}>
                      Save for my organization
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setDraftTemplate(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {selectedTemplate.subject && (
                    <p className="template-meta">
                      <strong>Subject:</strong> {selectedTemplate.subject}
                    </p>
                  )}
                  {selectedTemplate.type === 'email' ? (
                    // Sandboxed so template HTML can't run scripts in the admin app.
                    <iframe
                      className="template-body"
                      title="Email preview"
                      sandbox=""
                      srcDoc={selectedTemplate.body}
                    />
                  ) : (
                    <p className="phone-preview">{selectedTemplate.body}</p>
                  )}
                  <div>
                    <button type="button" onClick={() => setDraftTemplate({ ...selectedTemplate })}>
                      Customise
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      </div>

      {campaignList}
    </div>
  );
}

export default CampaignsPage;
