/* eslint-disable react/prop-types -- page-local components */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, MessageSquare, Rocket, Save } from 'lucide-react';
import {
  createCampaign,
  customizeTemplate,
  launchCampaign,
  listTemplates,
} from '../../api/campaigns';
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
import { cn } from '../../lib/cn';
import { useAsync } from '../../lib/useAsync';
import { formatDateTime } from '../../lib/format';

const STEPS = ['Details', 'Template', 'Audience', 'Review'];
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
  });
  const [edits, setEdits] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(null);

  const { data, error, loading, reload } = useAsync(() =>
    Promise.all([listTemplates(), listDepartments(), listEmployees()]).then(
      ([templates, departments, employees]) => ({ templates, departments, employees }),
    ),
  );

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const templates = (data?.templates || []).filter((t) => t.type === form.type);
  const template = data?.templates.find((t) => t.key === form.templateKey);
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
    if (current === 1 && !form.templateKey) next.templateKey = 'Pick a template';
    if (current === 1 && form.type === 'sms' && !body.includes('{{link}}'))
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
    setSaving(mode);
    try {
      if (edited) await customizeTemplate(template.key, { subject, body });
      const campaign = await createCampaign({
        name: form.name.trim(),
        type: form.type,
        templateKey: form.templateKey,
        difficultyLevel: form.difficultyLevel,
        departmentId: form.departmentId ? Number(form.departmentId) : undefined,
        scheduledAt:
          mode === 'launch' && form.when === 'later'
            ? new Date(form.scheduledAt).toISOString()
            : undefined,
      });
      if (mode === 'launch' && form.when === 'now') {
        try {
          const { message } = await launchCampaign(campaign.id);
          toast.success(message || 'Campaign launched');
        } catch (err) {
          const detail = err.response?.data?.detail;
          toast.error(
            `${err.response?.data?.message || 'Launch failed'}${detail ? `: ${detail}` : ''}. Saved as a draft.`,
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
                          onChange={() => setForm((f) => ({ ...f, type: value, templateKey: '' }))}
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
                  <p className="text-xs font-semibold text-ink-2">
                    {form.type === 'sms' ? 'SMS' : 'Email'} templates
                  </p>
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
                        setForm((f) => ({
                          ...f,
                          templateKey: t.key,
                          difficultyLevel: t.difficultyLevel || f.difficultyLevel,
                        }))
                      }
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-control border p-3 text-left transition',
                        form.templateKey === t.key
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
                {template && (
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
                    ['Template', template?.name],
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
