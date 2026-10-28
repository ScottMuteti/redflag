/* eslint-disable react/prop-types -- page-local components */
import { useMemo, useState } from 'react';
import { LayoutTemplate, Mail, MessageSquare, Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  createTemplate,
  customizeTemplate,
  listTemplates,
  resetTemplate,
} from '../api/campaigns';
import {
  createGlobalTemplate,
  deleteGlobalTemplate,
  listGlobalTemplates,
  updateGlobalTemplate,
} from '../api/system';
import { banks, CATEGORIES, DIFFICULTIES } from '../content/banks';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorCard,
  FormField,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  Skeleton,
  Tabs,
  Textarea,
  useToast,
} from '../components/ui';
import { GeneratePanel, TemplatePreview } from './admin/NewCampaignPage';
import { useAsync } from '../lib/useAsync';

const DIFFICULTY_TONE = { easy: 'success', medium: 'warning', hard: 'danger' };
const categoryLabel = (c) => banks[c]?.label || c || 'Uncategorised';
const errorOf = (err, fallback) => err.response?.data?.message || fallback;

// Org admins edit their own copy of a default (the default stays intact);
// system admins edit the global library every organisation starts from.
const SCOPES = {
  org: {
    title: 'Templates',
    subtitle: 'Default scenarios plus your own. Edits to a default are saved as your copy.',
    list: listTemplates,
    create: createTemplate,
    update: (t, payload) => customizeTemplate(t.key, payload),
    remove: (t) => resetTemplate(t.key),
  },
  system: {
    title: 'Global templates',
    subtitle: 'The default library every organisation starts from.',
    list: listGlobalTemplates,
    create: createGlobalTemplate,
    update: (t, payload) => updateGlobalTemplate(t.key, payload),
    remove: (t) => deleteGlobalTemplate(t.key),
  },
};

function originOf(t, scope) {
  if (scope === 'system') {
    return t.customisedBy > 0
      ? { label: `Customised by ${t.customisedBy} org${t.customisedBy === 1 ? '' : 's'}`, tone: 'neutral' }
      : null;
  }
  if (!t.isCustom) return { label: 'Default', tone: 'neutral' };
  return t.hasDefault ? { label: 'Customised', tone: 'brand' } : { label: 'Your template', tone: 'success' };
}

// Text-only teaser of an email body for the card.
const plain = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function TemplateCard({ template, scope, index, onOpen }) {
  const Icon = template.type === 'sms' ? MessageSquare : Mail;
  const origin = originOf(template, scope);
  return (
    <Card as="button" type="button" interactive index={index} onClick={onOpen} className="text-left">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-control bg-brand-50 text-brand-700">
          <Icon size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-label font-semibold text-ink">{template.name}</p>
          <p className="text-xs text-ink-3">
            {template.type === 'sms' ? 'SMS' : 'Email'} · {categoryLabel(template.category)}
          </p>
        </div>
        <Badge tone={DIFFICULTY_TONE[template.difficultyLevel] || 'neutral'}>
          {template.difficultyLevel}
        </Badge>
      </div>
      <p className="mt-3 line-clamp-3 text-body text-ink-2">
        {template.subject && <strong className="text-ink">{template.subject} — </strong>}
        {plain(template.body)}
      </p>
      {origin && (
        <div className="mt-3">
          <Badge tone={origin.tone}>{origin.label}</Badge>
        </div>
      )}
    </Card>
  );
}

function TemplateDrawer({ template, scope, onClose, onChanged }) {
  const toast = useToast();
  const api = SCOPES[scope];
  const [form, setForm] = useState({
    subject: template.subject || '',
    body: template.body,
    difficultyLevel: template.difficultyLevel,
  });
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  // Org: only its own copies can be removed (a customised default reverts).
  const removable = scope === 'system' || template.isCustom;
  const revertsToDefault = scope === 'org' && template.hasDefault;

  async function save() {
    if (!form.body.trim()) return toast.error('The message body is required');
    if (template.type === 'email' && !form.subject.trim()) return toast.error('Add a subject');
    setSaving(true);
    try {
      await api.update(template, form);
      toast.success(scope === 'org' && !template.isCustom ? 'Saved as your copy' : 'Template saved');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(errorOf(err, 'Could not save template'));
    } finally {
      setSaving(false);
    }
    return undefined;
  }

  async function remove() {
    setRemoving(true);
    try {
      await api.remove(template);
      toast.success(revertsToDefault ? 'Reverted to the default' : 'Template deleted');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(errorOf(err, 'Could not remove template'));
      setConfirming(false);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      width={560}
      title={template.name}
      subtitle={`${template.type === 'sms' ? 'SMS' : 'Email'} · ${categoryLabel(template.category)}`}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {removable ? (
            <Button
              variant="ghost"
              icon={revertsToDefault ? RotateCcw : Trash2}
              onClick={() => setConfirming(true)}
            >
              {revertsToDefault ? 'Revert to default' : 'Delete'}
            </Button>
          ) : (
            <span />
          )}
          <Button variant="primary" loading={saving} onClick={save}>
            Save
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <TemplatePreview template={template} subject={form.subject} body={form.body} />
        {template.type === 'email' && (
          <FormField label="Subject" required>
            <Input value={form.subject} onChange={set('subject')} />
          </FormField>
        )}
        <FormField
          label="Message"
          required
          hint={
            template.type === 'sms'
              ? '{{link}} becomes the tracking link'
              : 'HTML. {{.URL}} becomes the tracking link; {{.FirstName}} the recipient’s name'
          }
        >
          <Textarea rows={template.type === 'sms' ? 4 : 10} value={form.body} onChange={set('body')} />
        </FormField>
        <FormField label="Difficulty">
          <Select value={form.difficultyLevel} onChange={set('difficultyLevel')}>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d} className="capitalize">
                {d}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <ConfirmDialog
        open={confirming}
        title={revertsToDefault ? 'Revert to the default?' : 'Delete this template?'}
        message={
          revertsToDefault
            ? 'Your edits are discarded and campaigns use the default wording again.'
            : 'It will no longer be available for new campaigns.'
        }
        confirmLabel={revertsToDefault ? 'Revert' : 'Delete'}
        loading={removing}
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </Drawer>
  );
}

const BLANK = { type: 'email', name: '', category: '', difficultyLevel: 'medium', subject: '', body: '' };

function NewTemplateModal({ scope, onClose, onCreated }) {
  const toast = useToast();
  const api = SCOPES[scope];
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.body.trim()) return setError('Add a name and a message');
    if (form.type === 'email' && !form.subject.trim()) return setError('Add a subject');
    if (form.type === 'sms' && !form.body.includes('{{link}}')) {
      return setError('SMS messages need {{link}} where the tracking link goes');
    }
    setError('');
    setSaving(true);
    try {
      await api.create({ ...form, category: form.category || undefined });
      toast.success('Template created');
      onCreated();
      onClose();
    } catch (err) {
      setError(errorOf(err, 'Could not create template'));
    } finally {
      setSaving(false);
    }
    return undefined;
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="New template"
      description="Write one from scratch, or generate editable examples to start from."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="new-template" loading={saving}>
            Create template
          </Button>
        </>
      }
    >
      <form id="new-template" onSubmit={save} noValidate className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Channel">
            <Select value={form.type} onChange={set('type')}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </Select>
          </FormField>
          <FormField label="Category">
            <Select value={form.category} onChange={set('category')}>
              <option value="">None</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Difficulty">
            <Select value={form.difficultyLevel} onChange={set('difficultyLevel')}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="Name" required>
          <Input value={form.name} onChange={set('name')} />
        </FormField>
        {form.type === 'email' && (
          <FormField label="Subject" required>
            <Input value={form.subject} onChange={set('subject')} />
          </FormField>
        )}
        <FormField
          label="Message"
          required
          error={error}
          hint={form.type === 'sms' ? 'Include {{link}}' : 'HTML. Include {{.URL}} for the link'}
        >
          <Textarea rows={form.type === 'sms' ? 4 : 8} value={form.body} onChange={set('body')} />
        </FormField>
      </form>
      <div className="mt-4">
        <GeneratePanel
          channel={form.type}
          difficulty={form.difficultyLevel}
          create={api.create}
          onSaved={() => {
            onCreated();
            onClose();
          }}
        />
      </div>
    </Modal>
  );
}

function TemplatesPage({ scope = 'org' }) {
  const api = SCOPES[scope];
  const { data, error, loading, reload } = useAsync(api.list);
  const [channel, setChannel] = useState('all');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState(null);
  const [creating, setCreating] = useState(false);

  const templates = useMemo(() => data || [], [data]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter(
      (t) =>
        (channel === 'all' || t.type === channel) &&
        (!category || t.category === category) &&
        (!difficulty || t.difficultyLevel === difficulty) &&
        (!q || `${t.name} ${t.subject || ''} ${t.body}`.toLowerCase().includes(q)),
    );
  }, [templates, channel, category, difficulty, query]);
  const open = templates.find((t) => t.key === openKey);
  const count = (type) => templates.filter((t) => type === 'all' || t.type === type).length;

  return (
    <>
      <PageHeader
        title={api.title}
        subtitle={api.subtitle}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
            New template
          </Button>
        }
      />
      {error && <ErrorCard message={error} onRetry={reload} />}

      <Tabs
        className="mb-4"
        label="Channel"
        value={channel}
        onChange={setChannel}
        tabs={[
          { value: 'all', label: 'All', count: count('all') },
          { value: 'email', label: 'Email', count: count('email'), icon: Mail },
          { value: 'sms', label: 'SMS', count: count('sms'), icon: MessageSquare },
        ]}
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px_160px]">
        <SearchInput value={query} onChange={setQuery} placeholder="Search templates…" />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </Select>
        <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Difficulty">
          <option value="">Any difficulty</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </div>

      {loading && !data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40 rounded-card" />
          ))}
        </div>
      )}
      {data && filtered.length === 0 && (
        <Card>
          <EmptyState
            icon={LayoutTemplate}
            title={templates.length ? 'No templates match' : 'No templates yet'}
            description={
              templates.length ? 'Try a different filter or search.' : 'Create one to get started.'
            }
          />
        </Card>
      )}
      {filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t, i) => (
            <TemplateCard
              key={t.key}
              template={t}
              scope={scope}
              index={i}
              onOpen={() => setOpenKey(t.key)}
            />
          ))}
        </div>
      )}

      {open && (
        <TemplateDrawer
          key={open.key}
          template={open}
          scope={scope}
          onClose={() => setOpenKey(null)}
          onChanged={reload}
        />
      )}
      {creating && (
        <NewTemplateModal scope={scope} onClose={() => setCreating(false)} onCreated={reload} />
      )}
    </>
  );
}

export default TemplatesPage;
