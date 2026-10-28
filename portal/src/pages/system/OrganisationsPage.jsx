/* eslint-disable react/prop-types -- page-local components */
import { useMemo, useState } from 'react';
import { Building2, Check, Inbox, Pause, Play, Plus, UserPlus, X } from 'lucide-react';
import {
  addOrganizationAdmin,
  approveAccessRequest,
  declineAccessRequest,
  listAccessRequests,
  createOrganization,
  getOrganization,
  listOrganizations,
  reactivateOrganization,
  suspendOrganization,
} from '../../api/system';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  DataTable,
  Drawer,
  EmptyState,
  ErrorCard,
  FormField,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Skeleton,
  useToast,
} from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatNumber, formatPercent, relativeTime } from '../../lib/format';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const errorOf = (err, fallback) => err.response?.data?.message || fallback;

function OnboardModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', industry: '', county: '', adminFullName: '', adminEmail: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.adminFullName.trim()) return setError('Add the organisation and admin names');
    if (!EMAIL_RE.test(form.adminEmail)) return setError('Enter a valid admin email');
    setError('');
    setSaving(true);
    try {
      await createOrganization(form);
      toast.success(`${form.name} onboarded — invite sent to ${form.adminEmail}`);
      onCreated();
      onClose();
    } catch (err) {
      setError(errorOf(err, 'Could not onboard organisation'));
    } finally {
      setSaving(false);
    }
    return undefined;
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Onboard organisation"
      description="The admin gets an email link to set their password. They can then add employees."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="onboard-org" loading={saving}>
            Onboard
          </Button>
        </>
      }
    >
      <form id="onboard-org" onSubmit={save} noValidate className="grid gap-4">
        <FormField label="Organisation name" required>
          <Input value={form.name} onChange={set('name')} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Industry">
            <Input value={form.industry} onChange={set('industry')} />
          </FormField>
          <FormField label="County">
            <Input value={form.county} onChange={set('county')} />
          </FormField>
        </div>
        <FormField label="Admin full name" required>
          <Input value={form.adminFullName} onChange={set('adminFullName')} />
        </FormField>
        <FormField label="Admin email" required error={error}>
          <Input type="email" value={form.adminEmail} onChange={set('adminEmail')} />
        </FormField>
      </form>
    </Modal>
  );
}

// Approve = onboard from the request. Fields stay editable so the reviewer can
// fix a typo in the name or email before the invite goes out.
function ReviewModal({ request, onClose, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: request.organizationName,
    industry: request.industry || '',
    county: request.county || '',
    adminFullName: request.contactName,
    adminEmail: request.contactEmail,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  async function approve(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.adminFullName.trim()) return setError('Add the organisation and admin names');
    if (!EMAIL_RE.test(form.adminEmail)) return setError('Enter a valid admin email');
    setError('');
    setSaving(true);
    try {
      await approveAccessRequest(request.id, form);
      toast.success(`${form.name} approved — invite sent to ${form.adminEmail}`);
      onDone();
      onClose();
    } catch (err) {
      setError(errorOf(err, 'Could not approve request'));
    } finally {
      setSaving(false);
    }
    return undefined;
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Approve access"
      description="Creates the organisation and emails the contact a link to set their admin password."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Check} type="submit" form="approve-request" loading={saving}>
            Approve &amp; invite
          </Button>
        </>
      }
    >
      {(request.message || request.employeeCount || request.phoneNumber) && (
        <div className="mb-4 rounded-control bg-page px-3 py-2.5 text-body text-ink-2">
          {request.employeeCount && <p>About {formatNumber(request.employeeCount)} employees</p>}
          {request.phoneNumber && <p>Phone: {request.phoneNumber}</p>}
          {request.message && <p className="mt-1 whitespace-pre-line text-ink">“{request.message}”</p>}
        </div>
      )}
      <form id="approve-request" onSubmit={approve} noValidate className="grid gap-4">
        <FormField label="Organisation name" required>
          <Input value={form.name} onChange={set('name')} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Industry">
            <Input value={form.industry} onChange={set('industry')} />
          </FormField>
          <FormField label="County">
            <Input value={form.county} onChange={set('county')} />
          </FormField>
        </div>
        <FormField label="Admin full name" required>
          <Input value={form.adminFullName} onChange={set('adminFullName')} />
        </FormField>
        <FormField label="Admin email" required error={error}>
          <Input type="email" value={form.adminEmail} onChange={set('adminEmail')} />
        </FormField>
      </form>
    </Modal>
  );
}

function AccessRequestsCard({ onApproved }) {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => listAccessRequests('pending'));
  const [reviewing, setReviewing] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);

  async function decline() {
    setBusy(true);
    try {
      await declineAccessRequest(declining.id, notify);
      toast.success('Request declined');
      setDeclining(null);
      reload();
    } catch (err) {
      toast.error(errorOf(err, 'Could not decline request'));
    } finally {
      setBusy(false);
    }
  }

  if (!loading && !error && data?.length === 0) return null;

  return (
    <Card className="mb-4">
      <CardHeader title={`Access requests${data?.length ? ` (${data.length})` : ''}`} />
      {error && <ErrorCard message={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-16 rounded-control" />}
      {data?.length > 0 && (
        <ul className="grid gap-2">
          {data.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-control border border-line px-3 py-2.5"
            >
              <Inbox size={18} className="shrink-0 text-brand-700" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-label font-semibold text-ink">{r.organizationName}</p>
                <p className="truncate text-xs text-ink-3">
                  {r.contactName} · {r.contactEmail}
                  {r.employeeCount ? ` · ~${formatNumber(r.employeeCount)} staff` : ''} ·{' '}
                  {relativeTime(r.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" icon={X} variant="ghost" onClick={() => setDeclining(r)}>
                  Decline
                </Button>
                <Button size="sm" icon={Check} variant="primary" onClick={() => setReviewing(r)}>
                  Review
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {reviewing && (
        <ReviewModal
          request={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            reload();
            onApproved();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(declining)}
        title={`Decline ${declining?.organizationName}?`}
        message="The request is closed. Nothing is created."
        confirmLabel="Decline"
        loading={busy}
        onConfirm={decline}
        onCancel={() => setDeclining(null)}
      >
        <Checkbox
          label="Email the contact to let them know"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
        />
      </ConfirmDialog>
    </Card>
  );
}

function OrganisationDrawer({ id, onClose, onChanged }) {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => getOrganization(id), [id]);
  const [admin, setAdmin] = useState({ fullName: '', email: '' });
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toggling, setToggling] = useState(false);
  const suspended = Boolean(data?.suspendedAt);

  async function addAdmin(e) {
    e.preventDefault();
    if (!admin.fullName.trim() || !EMAIL_RE.test(admin.email)) {
      return toast.error('Add a name and a valid email');
    }
    setAdding(true);
    try {
      await addOrganizationAdmin(id, admin);
      toast.success(`Invite sent to ${admin.email}`);
      setAdmin({ fullName: '', email: '' });
      reload();
      onChanged();
    } catch (err) {
      toast.error(errorOf(err, 'Could not add admin'));
    } finally {
      setAdding(false);
    }
    return undefined;
  }

  async function toggle() {
    setToggling(true);
    try {
      await (suspended ? reactivateOrganization(id) : suspendOrganization(id));
      toast.success(suspended ? 'Organisation reactivated' : 'Organisation suspended');
      setConfirming(false);
      reload();
      onChanged();
    } catch (err) {
      toast.error(errorOf(err, 'Could not update organisation'));
    } finally {
      setToggling(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      width={520}
      title={data?.name || 'Organisation'}
      subtitle={data ? [data.industry, data.county].filter(Boolean).join(' · ') || 'No details' : ''}
      footer={
        data && (
          <Button
            icon={suspended ? Play : Pause}
            variant={suspended ? 'primary' : 'outline'}
            onClick={() => (suspended ? toggle() : setConfirming(true))}
            loading={toggling}
          >
            {suspended ? 'Reactivate' : 'Suspend access'}
          </Button>
        )
      }
    >
      {error && <ErrorCard message={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-48 rounded-card" />}
      {data && (
        <div className="grid gap-5">
          {suspended && (
            <p className="rounded-control bg-danger-bg px-3 py-2.5 text-body text-danger">
              Suspended {formatDate(data.suspendedAt)}. Its admins and employees can’t log in.
            </p>
          )}
          <dl className="grid grid-cols-2 gap-3">
            {[
              ['Employees', formatNumber(data.employeeCount)],
              ['Campaigns', formatNumber(data.campaignCount)],
              ['Click rate', formatPercent(data.clickRate)],
              ['Last launch', data.lastLaunchAt ? relativeTime(data.lastLaunchAt) : 'Never'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-control bg-page px-3 py-2.5">
                <dt className="text-xs text-ink-3">{label}</dt>
                <dd className="text-label font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <section>
            <h3 className="mb-2 text-label font-semibold text-ink">Admins</h3>
            <ul className="grid gap-2">
              {data.admins.map((a) => (
                <li key={a.id} className="rounded-control border border-line px-3 py-2">
                  <p className="text-body font-semibold text-ink">{a.fullName}</p>
                  <p className="text-xs text-ink-3">
                    {a.email} · added {formatDate(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <form onSubmit={addAdmin} noValidate className="grid gap-3 rounded-control border border-dashed border-line p-3">
            <p className="text-label font-semibold text-ink">Add an admin</p>
            <Input
              placeholder="Full name"
              aria-label="Full name"
              value={admin.fullName}
              onChange={(e) => setAdmin((a) => ({ ...a, fullName: e.target.value }))}
            />
            <Input
              type="email"
              placeholder="Email"
              aria-label="Email"
              value={admin.email}
              onChange={(e) => setAdmin((a) => ({ ...a, email: e.target.value }))}
            />
            <Button type="submit" icon={UserPlus} loading={adding} className="justify-self-start">
              Send invite
            </Button>
          </form>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        title={`Suspend ${data?.name}?`}
        message="Its admins and employees will be refused at login until you reactivate it. Nothing is deleted."
        confirmLabel="Suspend"
        loading={toggling}
        onConfirm={toggle}
        onCancel={() => setConfirming(false)}
      />
    </Drawer>
  );
}

function OrganisationsPage() {
  const { data, error, loading, reload } = useAsync(listOrganizations);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [onboarding, setOnboarding] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data || []).filter(
      (o) => !q || `${o.name} ${o.industry || ''} ${o.county || ''}`.toLowerCase().includes(q),
    );
  }, [data, query]);

  const columns = [
    {
      key: 'name',
      header: 'Organisation',
      sortValue: (o) => o.name,
      render: (o) => (
        <span className="block min-w-0">
          <span className="block truncate font-semibold">{o.name}</span>
          <span className="block truncate text-xs text-ink-3">
            {[o.industry, o.county].filter(Boolean).join(' · ') || '—'}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (o) => (o.suspendedAt ? 1 : 0),
      render: (o) =>
        o.suspendedAt ? <Badge tone="danger">Suspended</Badge> : <Badge tone="success">Active</Badge>,
    },
    { key: 'employeeCount', header: 'Employees', render: (o) => formatNumber(o.employeeCount) },
    { key: 'campaignCount', header: 'Campaigns', render: (o) => formatNumber(o.campaignCount) },
    { key: 'clickRate', header: 'Click rate', render: (o) => formatPercent(o.clickRate) },
    {
      key: 'lastLaunchAt',
      header: 'Last launch',
      sortValue: (o) => o.lastLaunchAt || '',
      render: (o) => (o.lastLaunchAt ? relativeTime(o.lastLaunchAt) : 'Never'),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      sortValue: (o) => o.createdAt,
      render: (o) => formatDate(o.createdAt),
    },
  ];

  const active = (data || []).filter((o) => !o.suspendedAt).length;

  return (
    <>
      <PageHeader
        title="Organisations"
        subtitle={data ? `${active} active · ${data.length - active} suspended` : 'Every tenant on RedFlag'}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setOnboarding(true)}>
            Onboard organisation
          </Button>
        }
      />
      {error && <ErrorCard message={error} onRetry={reload} />}
      <AccessRequestsCard onApproved={reload} />
      <Card padded={false}>
        <div className="border-b border-line p-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search organisations…" className="max-w-sm" />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading && !data}
          onRowClick={(o) => setOpenId(o.id)}
          caption="Organisations"
          empty={
            <EmptyState
              icon={Building2}
              title={query ? 'No organisations match' : 'No organisations yet'}
              description={query ? 'Try another search.' : 'Onboard the first one to get started.'}
            />
          }
        />
      </Card>
      {openId && (
        <OrganisationDrawer
          key={openId}
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={reload}
        />
      )}
      {onboarding && <OnboardModal onClose={() => setOnboarding(false)} onCreated={reload} />}
    </>
  );
}

export default OrganisationsPage;
