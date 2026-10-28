/* eslint-disable react/prop-types -- page-local components */
import { useEffect, useState } from 'react';
import { Fingerprint, Trash2 } from 'lucide-react';
import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser';
import {
  changePassword,
  deletePasskey,
  getMe,
  listPasskeys,
  passkeyRegisterOptions,
  passkeyRegisterVerify,
  updateMe,
  updateOrganization,
} from '../api/auth';
import { useAuth } from '../context/AuthContext';
import {
  Button,
  Card,
  IconButton,
  CardHeader,
  ErrorCard,
  FormField,
  Input,
  PageHeader,
  PasswordInput,
  Skeleton,
  useToast,
} from '../components/ui';
import { useAsync } from '../lib/useAsync';
import { formatDate, relativeTime } from '../lib/format';

const errorOf = (err, fallback) => err.response?.data?.message || fallback;

function ProfileCard({ me, onSaved }) {
  const toast = useToast();
  const { updateUser } = useAuth();
  const [fullName, setFullName] = useState(me.fullName);
  const [saving, setSaving] = useState(false);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateMe({ fullName });
      updateUser({ fullName: updated.fullName });
      toast.success('Profile saved');
      onSaved();
    } catch (err) {
      toast.error(errorOf(err, 'Could not save profile'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card index={0}>
      <CardHeader title="Profile" />
      <form onSubmit={save} className="grid gap-4">
        <FormField label="Full name" required>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </FormField>
        <FormField label="Email" hint="Ask your administrator to change your email">
          <Input value={me.email} disabled />
        </FormField>
        <Button type="submit" variant="primary" loading={saving} className="justify-self-start">
          Save profile
        </Button>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    if (form.next.length < 8) return setError('Use at least 8 characters');
    if (form.next !== form.confirm) return setError('Passwords don’t match');
    setError('');
    setSaving(true);
    try {
      await changePassword(form.current, form.next);
      toast.success('Password changed');
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setError(errorOf(err, 'Could not change password'));
    } finally {
      setSaving(false);
    }
    return undefined;
  }

  return (
    <Card index={1}>
      <CardHeader title="Password" />
      <form onSubmit={save} className="grid gap-4">
        <FormField label="Current password" required>
          <PasswordInput
            autoComplete="current-password"
            value={form.current}
            onChange={set('current')}
          />
        </FormField>
        <FormField label="New password" required hint="At least 8 characters">
          <PasswordInput autoComplete="new-password" value={form.next} onChange={set('next')} />
        </FormField>
        <FormField label="Confirm new password" required error={error}>
          <PasswordInput
            autoComplete="new-password"
            value={form.confirm}
            onChange={set('confirm')}
          />
        </FormField>
        <Button type="submit" loading={saving} className="justify-self-start">
          Change password
        </Button>
      </form>
    </Card>
  );
}

// A label for the new passkey so the list is readable later, e.g. "Windows · Chrome".
function deviceName() {
  const ua = navigator.userAgent;
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /iPhone|iPad/.test(ua)
      ? 'iPhone/iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Mac/.test(ua)
          ? 'Mac'
          : 'Device';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : '';
  return browser ? `${os} · ${browser}` : os;
}

function PasskeysCard() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(listPasskeys);
  const [adding, setAdding] = useState(false);
  const supported = browserSupportsWebAuthn();

  async function add() {
    setAdding(true);
    try {
      const { challengeId, options } = await passkeyRegisterOptions();
      const response = await startRegistration({ optionsJSON: options });
      await passkeyRegisterVerify(challengeId, response, deviceName());
      toast.success('Passkey added');
      reload();
    } catch (err) {
      // NotAllowedError = the user closed the browser prompt.
      if (err.name !== 'NotAllowedError') toast.error(errorOf(err, 'Could not add passkey'));
    } finally {
      setAdding(false);
    }
  }

  async function remove(passkey) {
    try {
      await deletePasskey(passkey.id);
      toast.success('Passkey removed');
      reload();
    } catch (err) {
      toast.error(errorOf(err, 'Could not remove passkey'));
    }
  }

  return (
    <Card index={2}>
      <CardHeader title="Passkeys" />
      <p className="text-body text-ink-2">
        Sign in with your fingerprint, face or device PIN instead of a password and email code.
      </p>
      {error && <p className="mt-3 text-body text-danger">{error}</p>}
      {loading && !data && <Skeleton className="mt-4 h-12 rounded-control" />}
      {data?.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {data.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-control border border-line px-3 py-2.5"
            >
              <Fingerprint size={18} className="shrink-0 text-brand-700" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-label font-semibold text-ink">{p.name}</p>
                <p className="text-xs text-ink-2">
                  Added {formatDate(p.createdAt)}
                  {p.lastUsedAt && ` · Last used ${relativeTime(new Date(p.lastUsedAt))}`}
                </p>
              </div>
              <IconButton
                icon={Trash2}
                variant="ghost"
                label={`Remove ${p.name}`}
                onClick={() => remove(p)}
              />
            </li>
          ))}
        </ul>
      )}
      <Button
        icon={Fingerprint}
        loading={adding}
        disabled={!supported}
        onClick={add}
        className="mt-4"
      >
        Add a passkey
      </Button>
      {!supported && (
        <p className="mt-2 text-xs text-ink-2">This browser doesn’t support passkeys.</p>
      )}
    </Card>
  );
}

function OrganisationCard({ me, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', industry: '', county: '' });
  const [saving, setSaving] = useState(false);
  useEffect(
    () =>
      setForm({
        name: me.organizationName || '',
        industry: me.industry || '',
        county: me.county || '',
      }),
    [me],
  );
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateOrganization(form);
      toast.success('Organisation saved');
      onSaved();
    } catch (err) {
      toast.error(errorOf(err, 'Could not save organisation'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card index={3} className="lg:col-span-2">
      <CardHeader title="Organisation" />
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-3">
        <FormField label="Name" required>
          <Input value={form.name} onChange={set('name')} />
        </FormField>
        <FormField label="Industry">
          <Input value={form.industry} onChange={set('industry')} />
        </FormField>
        <FormField label="County">
          <Input value={form.county} onChange={set('county')} />
        </FormField>
        <Button type="submit" variant="primary" loading={saving} className="justify-self-start">
          Save organisation
        </Button>
      </form>
    </Card>
  );
}

function SettingsPage() {
  const { data, error, loading, reload } = useAsync(getMe);

  return (
    <>
      <PageHeader title="Settings" subtitle={data?.organizationName || 'Your account'} />
      {error && <ErrorCard message={error} onRetry={reload} />}
      {loading && !data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      )}
      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ProfileCard me={data} onSaved={reload} />
          <PasswordCard />
          <PasskeysCard />
          {data.role === 'admin' && <OrganisationCard me={data} onSaved={reload} />}
        </div>
      )}
    </>
  );
}

export default SettingsPage;
