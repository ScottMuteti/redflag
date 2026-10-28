/* eslint-disable react/prop-types -- page-local components */
import { useState } from 'react';
import { CheckCircle2, Flag, ShieldAlert } from 'lucide-react';
import { listReports, submitReport } from '../../api/reports';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorCard,
  FormField,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import { formatDateTime } from '../../lib/format';

const EMPTY = { channel: 'email', sender: '', subject: '', details: '' };

function ReportForm({ onReported }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.sender.trim() && !form.subject.trim() && !form.details.trim()) {
      return setError('Tell us who sent it or what it said');
    }
    setError('');
    setSaving(true);
    try {
      const res = await submitReport(form);
      setResult(res);
      setForm(EMPTY);
      onReported();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send report');
    } finally {
      setSaving(false);
    }
    return undefined;
  }

  if (result) {
    return (
      <Card index={0}>
        <div className="flex flex-col items-center py-6 text-center">
          {result.matchedSimulation ? (
            <CheckCircle2 size={36} className="text-success" aria-hidden="true" />
          ) : (
            <ShieldAlert size={36} className="text-warning" aria-hidden="true" />
          )}
          <p className="mt-3 text-label font-semibold text-ink">
            {result.matchedSimulation
              ? 'Good catch! That was a simulation.'
              : 'Thanks, your report was sent.'}
          </p>
          <p className="mt-1 max-w-sm text-body text-ink-3">
            {result.matchedSimulation
              ? `It was part of “${result.campaignName}”. Reporting it lowers your risk score.`
              : 'Your security team will look into it. Don’t click links or reply to the message.'}
          </p>
          <Button className="mt-4" onClick={() => setResult(null)}>
            Report another
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card index={0}>
      <CardHeader
        title="Report a suspicious message"
        subtitle="Don’t click links or reply. Just tell us about it."
      />
      <form onSubmit={submit} className="grid gap-4">
        <FormField label="How did it arrive?">
          <Select value={form.channel} onChange={set('channel')}>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="call">Phone call</option>
            <option value="other">Other</option>
          </Select>
        </FormField>
        <FormField label="Sender" hint="Email address, phone number or name">
          <Input value={form.sender} onChange={set('sender')} />
        </FormField>
        {form.channel === 'email' && (
          <FormField label="Subject">
            <Input value={form.subject} onChange={set('subject')} />
          </FormField>
        )}
        <FormField label="What made it suspicious?" error={error}>
          <Textarea rows={3} value={form.details} onChange={set('details')} />
        </FormField>
        <Button
          type="submit"
          variant="primary"
          icon={Flag}
          loading={saving}
          className="justify-self-start"
        >
          Send report
        </Button>
      </form>
    </Card>
  );
}

function MyReportsPage() {
  const { data, error, loading, reload } = useAsync(listReports);
  const caught = (data || []).filter((r) => r.matchedSimulation).length;

  return (
    <>
      <PageHeader
        title="Reports Sent"
        subtitle={
          data
            ? `${data.length} reported · ${caught} simulations caught`
            : 'Suspicious messages you flagged'
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ReportForm onReported={reload} />
        <Card index={1}>
          <CardHeader title="History" />
          {error && <ErrorCard message={error} onRetry={reload} />}
          {loading && <Skeleton className="h-32" />}
          {data?.length === 0 && (
            <EmptyState
              icon={Flag}
              title="Nothing reported yet"
              description="Spot something odd? Report it here."
            />
          )}
          <ul className="grid gap-3">
            {data?.map((r) => (
              <li key={r.id} className="rounded-control border border-line p-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">
                      {r.subject || r.sender || 'Suspicious message'}
                    </span>
                    <span className="block text-xs text-ink-3 capitalize">
                      {r.channel} · {formatDateTime(r.createdAt)}
                    </span>
                  </span>
                  {r.matchedSimulation ? (
                    <Badge tone="success">Simulation caught</Badge>
                  ) : (
                    <Badge tone="neutral">Under review</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

export default MyReportsPage;
