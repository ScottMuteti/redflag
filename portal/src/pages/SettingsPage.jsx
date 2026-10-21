/* eslint-disable react/prop-types -- page-local components */
import { useEffect, useState } from 'react';
import { changePassword, getMe, updateMe, updateOrganization } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import {
  Button,
  Card,
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
    <Card index={2} className="lg:col-span-2">
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
          {data.role === 'admin' && <OrganisationCard me={data} onSaved={reload} />}
        </div>
      )}
    </>
  );
}

export default SettingsPage;
