/* eslint-disable react/prop-types -- page-local components */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, MessageSquare, Rocket, Save, Sparkles } from 'lucide-react';
import {
  createCampaign,
  createTemplate,
  customizeTemplate,
  launchCampaign,
  listTemplates,
} from '../../api/campaigns';
import { generate, draftToTemplatePayload, channelsFor, CATEGORIES } from '../../content/generator';
import { listDepartments, listEmployees } from '../../api/employees';
import {
  Badge,
  Button,
  Card,
  ErrorCard,
  FormField,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Stepper,
  Textarea,
  useToast,
} from '../../components/ui';
import AuthorisationCheck from '../../components/AuthorisationCheck';
import { cn } from '../../lib/cn';
import { useAsync } from '../../lib/useAsync';
import { formatDateTime } from '../../lib/format';

const STEPS = ['Details', 'Template', 'Audience', 'Review'];
// Send-time jitter: spread delivery so the batch doesn't arrive all at once.
const SEND_WINDOWS = [
  [0, 'All at once'],
  [30, 'Over 30 minutes'],
  [120, 'Over 2 hours'],
  [480, 'Over a working day (8 hours)'],
];
const DIFFICULTY_TONE = { easy: 'success', medium: 'warning', hard: 'danger' };

export function TemplatePreview({ template, subject, body }) {
  if (template.type === 'sms') {
    return (
      <div className="mx-auto max-w-xs rounded-card bg-page p-4">
        <p className="mb-2 text-micro text-ink-3">SMS preview</p>
        <p className="rounded-card rounded-bl-sm bg-card p-3 text-body break-words text-ink shadow-card">
          {body.replace('{{link}}', 'https://track.example/abc123')}
        </p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-card border border-line">
      <div className="border-b border-line bg-page px-4 py-2.5 text-xs text-ink-3">
        Subject: <strong className="text-ink">{subject}</strong>
      </div>
      {/* Admin-authored template HTML, rendered sandboxed with scripts disabled. */}
      <iframe
        title="Email preview"
        sandbox=""
        className="h-56 w-full bg-white"
        srcDoc={`<div style="font-family:sans-serif;font-size:14px;padding:12px">${body.replace(
          /\{\{\.URL\}\}/g,
          '#',
        )}</div>`}
      />
    </div>
  );
}

// Internal sample generator panel. Produces editable draft options client-side
// (no network, no external AI); saving a chosen draft persists it as a reusable
// org template via the normal API and selects it for the campaign.
export function GeneratePanel({ channel, difficulty, onSaved, create = createTemplate }) {
  const toast = useToast();
  const categories = useMemo(
    () => CATEGORIES.filter((c) => channelsFor(c).includes(channel)),
    [channel],
  );
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(categories[0]);
  // Seed from the campaign's chosen difficulty; "any" mixes levels in the batch.
  const [level, setLevel] = useState(difficulty || 'any');
  const [drafts, setDrafts] = useState([]);
  const [savingId, setSavingId] = useState(null);

  // Keep the category valid when the channel changes.
  if (!categories.includes(category) && categories[0]) setCategory(categories[0]);

  function runGenerate() {
    setDrafts(generate({ category, channel, difficulty: level, count: 5 }));
  }

  function editDraft(id, patch) {
    setDrafts((list) => list.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  async function saveDraft(draft) {
    setSavingId(draft.id);
    try {
      const created = await create(draftToTemplatePayload(draft));
      toast.success('Saved to your templates');
      onSaved(created);
      setDrafts((list) => list.filter((d) => d.id !== draft.id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save template');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="rounded-control border border-dashed border-line p-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left text-xs font-semibold text-brand-700"
      >
        <Sparkles size={14} aria-hidden="true" />
        Generate example messages
      </button>
      {open && (
        <div className="mt-3 grid gap-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Difficulty">
              <option value="any">Any level (mixed)</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
            <Button type="button" icon={Sparkles} onClick={runGenerate}>
              Generate 5
            </Button>
          </div>
          {drafts.length > 0 && (
            <p className="text-xs text-ink-3">
              Edit any option, then save it to reuse and select it for this campaign.
            </p>
          )}
          <div className="grid gap-3">
            {drafts.map((d) => (
              <div key={d.id} className="grid gap-2 rounded-control border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink-2 capitalize">{d.name}</span>
                  <Badge tone={DIFFICULTY_TONE[d.difficulty] || 'neutral'}>{d.difficulty}</Badge>
                </div>
                {d.type === 'email' && (
                  <Input
                    value={d.subject}
                    onChange={(e) => editDraft(d.id, { subject: e.target.value })}
                    aria-label="Subject"
                  />
                )}
                <Textarea
                  rows={d.type === 'sms' ? 3 : 6}
                  value={d.body}
                  onChange={(e) => editDraft(d.id, { body: e.target.value })}
                  aria-label="Message body"
                />
                <Button
                  type="button"
                  size="sm"
                  icon={Save}
                  loading={savingId === d.id}
                  className="justify-self-start"
                  onClick={() => saveDraft(d)}
                >
                  Save &amp; use
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewCampaignPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    type: 'email',
    templateKey: '',
    difficultyLevel: 'medium',
    departmentId: '',
    when: 'now',
    scheduledAt: '',
    sendWindowMinutes: 0,
    mix: false,
    pool: [], // template keys when mix is on; each recipient gets one at random
  });
  const [edits, setEdits] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(null);
  const [authorised, setAuthorised] = useState(false);
  // Templates created from generated drafts this session, merged in so they are
  // selectable immediately without waiting for the background reload.
  const [savedTemplates, setSavedTemplates] = useState([]);

  const { data, error, loading, reload } = useAsync(() =>
    Promise.all([listTemplates(), listDepartments(), listEmployees()]).then(
      ([templates, departments, employees]) => ({ templates, departments, employees }),
    ),
  );

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const allTemplates = useMemo(() => {
    const base = data?.templates || [];
    const keys = new Set(base.map((t) => t.key));
    return [...base, ...savedTemplates.filter((t) => !keys.has(t.key))];
  }, [data, savedTemplates]);
  const templates = allTemplates.filter((t) => t.type === form.type);
  const template = allTemplates.find((t) => t.key === form.templateKey);

  function handleGeneratedSaved(created) {
    setSavedTemplates((prev) => [created, ...prev]);
    setForm((f) => ({
      ...f,
      templateKey: created.key,
      difficultyLevel: created.difficultyLevel || f.difficultyLevel,
    }));
    reload();
  }
  const edited = template && edits[template.key];
  const subject = edited?.subject ?? template?.subject ?? '';
  const body = edited?.body ?? template?.body ?? '';

  const audience = useMemo(() => {
    const people = (data?.employees || []).filter(
      (e) => !form.departmentId || String(e.departmentId) === form.departmentId,
    );
    return {
      total: people.length,
      reachable: form.type === 'sms' ? people.filter((e) => e.phoneNumber).length : people.length,
    };
  }, [data, form.departmentId, form.type]);

  function validate(current) {
    const next = {};
    if (current === 0 && !form.name.trim()) next.name = 'Give the campaign a name';
    if (current === 1 && form.mix && form.pool.length < 2)
      next.templateKey = 'Pick at least two templates for a mixed batch';
    if (current === 1 && !form.mix && !form.templateKey) next.templateKey = 'Pick a template';
    if (current === 1 && !form.mix && form.type === 'sms' && !body.includes('{{link}}'))
      next.body = 'SMS body must contain {{link}}';
    if (current === 2 && audience.reachable === 0)
      next.audience = 'No one in this audience can be reached';
    if (current === 3 && form.when === 'later') {
      if (!form.scheduledAt) next.scheduledAt = 'Pick a date and time';
      else if (new Date(form.scheduledAt) <= new Date())
        next.scheduledAt = 'Pick a time in the future';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (validate(step)) setStep((s) => s + 1);
  }

  async function submit(mode) {
    if (!validate(3)) return;
    if (mode === 'launch' && !authorised) {
      setErrors({ authorisation: 'Confirm authorisation before launching or scheduling' });
      return;
    }
    setSaving(mode);
    try {
      // Inline edits only apply to a single chosen template, not a mixed pool.
      if (!form.mix && edited) await customizeTemplate(template.key, { subject, body });
      const campaign = await createCampaign({
        name: form.name.trim(),
        type: form.type,
        templateKey: form.mix ? form.pool[0] : form.templateKey,
        templatePool: form.mix ? form.pool : undefined,
        difficultyLevel: form.difficultyLevel,
        departmentId: form.departmentId ? Number(form.departmentId) : undefined,
        scheduledAt:
          mode === 'launch' && form.when === 'later'
            ? new Date(form.scheduledAt).toISOString()
            : undefined,
        sendWindowMinutes: form.sendWindowMinutes,
        acknowledgeAuthorisation: mode === 'launch' ? authorised : undefined,
      });
      if (mode === 'launch' && form.when === 'now') {
        try {
          const { message } = await launchCampaign(campaign.id, {
            acknowledgeAuthorisation: authorised,
          });
          toast.success(message || 'Campaign launched');
        } catch (err) {
          const detail = err.response?.data?.detail;
          toast.error(
            `${err.response?.data?.message || 'Launch failed'}${detail ? `: ${detail}` : ''}. Marked as failed; you can retry from the campaign page.`,
          );
        }
      } else {
        toast.success(mode === 'draft' ? 'Draft saved' : 'Campaign scheduled');
      }
      navigate(`/admin/campaigns/${campaign.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create campaign');
    } finally {
      setSaving(null);
    }
  }

  if (error) return <ErrorCard message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title="New campaign"
        subtitle="Set up a simulated attack"
        actions={
          <Button as={Link} to="/admin/campaigns" icon={ArrowLeft}>
            Campaigns
          </Button>
        }
      />
      <Card index={0}>
        <Stepper steps={STEPS} current={step} className="mb-6" />

        {loading ? (
          <div className="grid gap-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : (
          <>
            {step === 0 && (
              <div className="grid max-w-xl gap-4">
                <FormField label="Campaign name" required error={errors.name}>
                  <Input value={form.name} onChange={set('name')} placeholder="e.g. Q4 KRA drill" />
                </FormField>
                <fieldset className="grid gap-1.5">
                  <legend className="mb-1.5 text-xs font-semibold text-ink-2">Channel</legend>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['email', 'Email', Mail, 'Sent through Gophish'],
                      ['sms', 'SMS', MessageSquare, "Sent through Africa's Talking"],
                    ].map(([value, label, Icon, hint]) => (
                      <label
                        key={value}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-control border p-3 transition',
                          form.type === value
                            ? 'border-2 border-brand-700 bg-brand-50'
                            : 'border-line hover:bg-brand-50',
                        )}
                      >
                        <input
                          type="radio"
                          name="channel"
                          value={value}
                          checked={form.type === value}
                          onChange={() =>
                            setForm((f) => ({ ...f, type: value, templateKey: '', pool: [] }))
                          }
                          className="sr-only"
                        />
                        <Icon size={18} className="mt-0.5 text-brand-700" aria-hidden="true" />
                        <span>
                          <span className="block font-semibold text-ink">{label}</span>
                          <span className="block text-xs text-ink-3">{hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <FormField label="Difficulty">
                  <Select value={form.difficultyLevel} onChange={set('difficultyLevel')}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </Select>
                </FormField>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="grid content-start gap-2">
                  <GeneratePanel
                    channel={form.type}
                    difficulty={form.difficultyLevel}
                    onSaved={handleGeneratedSaved}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-ink-2">
                      {form.type === 'sms' ? 'SMS' : 'Email'} templates
                    </p>
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-2">
                      <input
                        type="checkbox"
                        checked={form.mix}
                        onChange={(e) => setForm((f) => ({ ...f, mix: e.target.checked }))}
                      />
                      Mixed batch
                    </label>
                  </div>
                  {form.mix && (
                    <p className="text-xs text-ink-3">
                      Pick two or more. Each recipient gets a different one at random, so the drill
                      is not an identical message to everyone.
                    </p>
                  )}
                  {templates.length === 0 && (
                    <p className="text-body text-ink-3">
                      No templates for this channel.{' '}
                      <Link to="/admin/templates" className="font-semibold text-brand-700">
                        Add one
                      </Link>
                    </p>
                  )}
                  {templates.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() =>
                        setForm((f) =>
                          f.mix
                            ? {
                                ...f,
                                pool: f.pool.includes(t.key)
                                  ? f.pool.filter((k) => k !== t.key)
                                  : [...f.pool, t.key],
                              }
                            : {
                                ...f,
                                templateKey: t.key,
                                difficultyLevel: t.difficultyLevel || f.difficultyLevel,
                              },
                        )
                      }
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-control border p-3 text-left transition',
                        (form.mix ? form.pool.includes(t.key) : form.templateKey === t.key)
                          ? 'border-2 border-brand-700 bg-brand-50'
                          : 'border-line hover:bg-brand-50',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{t.name}</span>
                        <span className="block text-xs text-ink-3 capitalize">
                          {t.category || 'general'}
                          {t.isCustom && ' · customised'}
                        </span>
                      </span>
                      <Badge tone={DIFFICULTY_TONE[t.difficultyLevel] || 'neutral'}>
                        {t.difficultyLevel || 'medium'}
                      </Badge>
                    </button>
                  ))}
                  {errors.templateKey && (
                    <p className="text-xs text-danger">{errors.templateKey}</p>
                  )}
                </div>
                {form.mix && (
                  <div className="grid content-start gap-2">
                    <p className="text-xs font-semibold text-ink-2">
                      Pool ({form.pool.length} selected)
                    </p>
                    {form.pool.length === 0 ? (
                      <p className="text-body text-ink-3">
                        Select templates on the left to build the batch.
                      </p>
                    ) : (
                      form.pool.map((key) => {
                        const t = allTemplates.find((x) => x.key === key);
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between gap-2 rounded-control border border-line p-2.5"
                          >
                            <span className="truncate text-body text-ink">{t?.name || key}</span>
                            <Badge tone={DIFFICULTY_TONE[t?.difficultyLevel] || 'neutral'}>
                              {t?.difficultyLevel || 'medium'}
                            </Badge>
                          </div>
                        );
                      })
                    )}
                    <p className="text-xs text-ink-3">
                      Recipients are split evenly and at random across these messages.
                    </p>
                  </div>
                )}
                {!form.mix && template && (
                  <div className="grid content-start gap-3">
                    <TemplatePreview template={template} subject={subject} body={body} />
                    {template.type === 'email' && (
                      <FormField label="Subject">
                        <Input
                          value={subject}
                          onChange={(e) =>
                            setEdits((x) => ({
                              ...x,
                              [template.key]: { subject: e.target.value, body },
                            }))
                          }
                        />
                      </FormField>
                    )}
                    <FormField
                      label="Message"
                      hint={
                        template.type === 'sms'
                          ? 'Keep {{link}} where the tracking link goes'
                          : 'Keep {{.URL}} where the tracking link goes'
                      }
                      error={errors.body}
                    >
                      <Textarea
                        rows={template.type === 'sms' ? 4 : 7}
                        value={body}
                        onChange={(e) =>
                          setEdits((x) => ({
                            ...x,
                            [template.key]: { subject, body: e.target.value },
                          }))
                        }
                      />
                    </FormField>
                    {edited && (
                      <p className="text-xs text-ink-3">
                        Edits are saved as your organisation’s copy of this template.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="grid max-w-xl gap-4">
                <FormField label="Who should receive it?">
                  <Select value={form.departmentId} onChange={set('departmentId')}>
                    <option value="">Everyone</option>
                    {data.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <div className="rounded-control border border-line bg-page p-4 text-body">
                  <p className="text-stat leading-none font-bold text-ink">{audience.reachable}</p>
                  <p className="mt-1 text-ink-3">
                    {form.type === 'sms'
                      ? `of ${audience.total} employees have a phone number`
                      : 'employees will get the email'}
                  </p>
                </div>
                {errors.audience && <p className="text-xs text-danger">{errors.audience}</p>}
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-5 lg:grid-cols-2">
                <dl className="grid content-start gap-2 rounded-control border border-line p-4 text-body">
                  {[
                    ['Name', form.name],
                    ['Channel', form.type === 'sms' ? 'SMS' : 'Email'],
                    ['Template', form.mix ? `Mixed batch · ${form.pool.length} variants` : template?.name],
                    ['Difficulty', form.difficultyLevel],
                    [
                      'Audience',
                      `${form.departmentId ? data.departments.find((d) => String(d.id) === form.departmentId)?.name : 'Everyone'} · ${audience.reachable} people`,
                    ],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt className="text-ink-3">{k}</dt>
                      <dd className="text-right font-semibold text-ink capitalize">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="grid content-start gap-3">
                  <p className="text-xs font-semibold text-ink-2">When</p>
                  {[
                    ['now', 'Launch now'],
                    ['later', 'Schedule for later'],
                  ].map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-body text-ink">
                      <input
                        type="radio"
                        name="when"
                        checked={form.when === value}
                        onChange={() => setForm((f) => ({ ...f, when: value }))}
                      />
                      {label}
                    </label>
                  ))}
                  <FormField
                    label="Delivery"
                    hint="Staggered sends look less like a bulk blast and are harder to warn colleagues about."
                  >
                    <Select
                      value={form.sendWindowMinutes}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, sendWindowMinutes: Number(e.target.value) }))
                      }
                    >
                      {SEND_WINDOWS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <AuthorisationCheck
                    checked={authorised}
                    onChange={(value) => {
                      setAuthorised(value);
                      setErrors((e) => ({ ...e, authorisation: undefined }));
                    }}
                    error={errors.authorisation}
                  />
                  {form.when === 'later' && (
                    <FormField
                      label="Launch at"
                      error={errors.scheduledAt}
                      hint={form.scheduledAt ? formatDateTime(form.scheduledAt) : undefined}
                    >
                      <Input
                        type="datetime-local"
                        value={form.scheduledAt}
                        onChange={set('scheduledAt')}
                      />
                    </FormField>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-line pt-4">
              <Button icon={ArrowLeft} onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
                Back
              </Button>
              <div className="flex flex-wrap gap-2">
                {step === 3 ? (
                  <>
                    <Button
                      icon={Save}
                      loading={saving === 'draft'}
                      onClick={() => submit('draft')}
                    >
                      Save draft
                    </Button>
                    <Button
                      variant="primary"
                      icon={Rocket}
                      loading={saving === 'launch'}
                      onClick={() => submit('launch')}
                    >
                      {form.when === 'later' ? 'Schedule' : 'Launch'}
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" iconRight={ArrowRight} onClick={goNext}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}

export default NewCampaignPage;
