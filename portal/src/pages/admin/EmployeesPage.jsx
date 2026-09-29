/* eslint-disable react/prop-types -- page-local components */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Copy, KeyRound, Trash2, UserPlus } from 'lucide-react';
import { getEmployeeAnalytics } from '../../api/analytics';
import {
  createEmployee,
  deleteEmployee,
  listDepartments,
  listEmployees,
  resetEmployeePassword,
} from '../../api/employees';
import { computeScore } from '../../api/scoring';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  Drawer,
  DropdownButton,
  EmptyState,
  ErrorCard,
  FormField,
  Input,
  Modal,
  PageHeader,
  PasswordInput,
  RiskPill,
  SearchInput,
  useToast,
} from '../../components/ui';
import { settle, useAsync } from '../../lib/useAsync';
import { formatDate, riskLevelOf, tenure, toScore } from '../../lib/format';

const EMPTY_FORM = {
  fullName: '',
  email: '',
  phoneNumber: '',
  jobTitle: '',
  departmentName: '',
  hireDate: '',
  initialPassword: '',
};

async function loadEmployees() {
  const [employees, departments] = await Promise.all([listEmployees(), listDepartments()]);
  const stats = await Promise.all(employees.map((e) => settle(getEmployeeAnalytics(e.id), null)));
  return {
    departments,
    employees: employees.map((e, i) => {
      const s = stats[i];
      const score = s?.latestScore ? Number(s.latestScore.score) : null;
      return {
        ...e,
        score,
        riskLevel: s?.latestScore?.riskLevel || riskLevelOf(score),
        attempts: s?.attempts || { total: 0, clicked: 0, submitted: 0 },
        training: s?.training || { totalAssignments: 0, completedAssignments: 0 },
      };
    }),
  };
}

function TrainingStatus({ training }) {
  const { totalAssignments: total, completedAssignments: done } = training;
  if (total === 0) return <span className="text-ink-3">None assigned</span>;
  if (done === total) return <Badge tone="success">Complete</Badge>;
  return (
    <Badge tone="warning">
      {done}/{total} done
    </Badge>
  );
}

// Add-employee form. On success it shows the login details the admin hands to the employee.
function AddEmployeeModal({ open, onClose, onCreated, departments }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  const field = (name) => ({
    value: form[name],
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
  });

  function close() {
    setForm(EMPTY_FORM);
    setErrors({});
    setCreated(null);
    onClose();
  }

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (!form.fullName.trim()) next.fullName = 'Full name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address';
    if (form.initialPassword.length < 8) next.initialPassword = 'Use at least 8 characters';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await createEmployee(form);
      setCreated({ name: form.fullName, email: form.email, password: form.initialPassword });
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add employee');
    } finally {
      setSaving(false);
    }
  }

  async function copyDetails() {
    const text = `RedFlag login\nLink: ${window.location.origin}/login\nEmail: ${created.email}\nPassword: ${created.password}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Login details copied');
    } catch {
      toast.error('Could not copy. Select the details and copy them manually.');
    }
  }

  if (created) {
    return (
      <Modal
        open={open}
        onClose={close}
        title="Employee added"
        footer={
          <>
            <Button icon={Copy} onClick={copyDetails}>
              Copy details
            </Button>
            <Button variant="primary" onClick={close}>
              Done
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success-bg text-success">
            <CheckCircle2 size={20} aria-hidden="true" />
          </span>
          <p className="text-body text-ink-2">
            Share these details with <strong className="text-ink">{created.name}</strong>. They log
            in at the normal login page. Employees can’t sign up on their own.
          </p>
        </div>
        <dl className="mt-4 grid gap-2 rounded-control border border-line bg-page p-4 text-body">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-3">Login page</dt>
            <dd className="font-semibold text-ink">{window.location.origin}/login</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-3">Email</dt>
            <dd className="font-semibold text-ink">{created.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-3">Password</dt>
            <dd className="font-semibold text-ink">{created.password}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-ink-3">
          The password isn’t shown again. You can set a new one from the employee’s panel.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add employee"
      description="You set their login details. They use them to sign in."
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" type="submit" form="add-employee" loading={saving}>
            Add employee
          </Button>
        </>
      }
    >
      <form id="add-employee" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full name" required error={errors.fullName} className="sm:col-span-2">
          <Input {...field('fullName')} />
        </FormField>
        <FormField label="Work email" required error={errors.email}>
          <Input type="email" {...field('email')} />
        </FormField>
        <FormField label="Phone number" hint="Needed for SMS simulations">
          <Input placeholder="+2547…" {...field('phoneNumber')} />
        </FormField>
        <FormField label="Department">
          <Input list="department-options" {...field('departmentName')} />
        </FormField>
        <datalist id="department-options">
          {departments.map((d) => (
            <option key={d.id} value={d.name} />
          ))}
        </datalist>
        <FormField label="Job title">
          <Input {...field('jobTitle')} />
        </FormField>
        <FormField label="Hire date">
          <Input type="date" {...field('hireDate')} />
        </FormField>
        <FormField
          label="Initial password"
          required
          hint="At least 8 characters"
          error={errors.initialPassword}
        >
          <PasswordInput autoComplete="new-password" {...field('initialPassword')} />
        </FormField>
      </form>
    </Modal>
  );
}

function EmployeeDrawer({ employee, onClose, onChanged }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (!employee) return null;

  async function rescore() {
    setBusy('score');
    try {
      await computeScore(employee.id);
      toast.success('Risk score updated');
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not compute score');
    } finally {
      setBusy(null);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Use at least 8 characters');
      return;
    }
    setBusy('password');
    try {
      await resetEmployeePassword(employee.id, password);
      toast.success(`New password set for ${employee.fullName}`);
      setPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reset password');
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy('remove');
    try {
      await deleteEmployee(employee.id);
      toast.success(`${employee.fullName} removed`);
      setConfirmRemove(false);
      onClose();
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove employee');
    } finally {
      setBusy(null);
    }
  }

  const { attempts, training } = employee;

  return (
    <Drawer open onClose={onClose} title={employee.fullName} subtitle={employee.email}>
      <div className="grid gap-5 p-5">
        <div className="flex items-center gap-3">
          <Avatar name={employee.fullName} size="lg" />
          <div>
            <p className="text-label font-semibold text-ink">
              {employee.jobTitle || 'No job title'}
            </p>
            <p className="text-xs text-ink-3">
              {employee.departmentName || 'No department'} · {tenure(employee.hireDate)}
            </p>
          </div>
        </div>

        <Card>
          <p className="text-xs text-ink-3">Risk score</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="text-stat leading-none font-bold text-ink">
              {toScore(employee.score) ?? '—'}
              {employee.score !== null && <span className="text-label text-ink-3">/100</span>}
            </span>
            <RiskPill level={employee.riskLevel} />
          </div>
          <Button size="sm" className="mt-3" loading={busy === 'score'} onClick={rescore}>
            Recompute score
          </Button>
        </Card>

        <dl className="grid grid-cols-3 gap-3 text-center">
          {[
            ['Simulations', attempts.total],
            ['Clicked', attempts.clicked],
            ['Training done', `${training.completedAssignments}/${training.totalAssignments}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-control border border-line p-3">
              <dt className="text-micro text-ink-3">{label}</dt>
              <dd className="text-label font-bold text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <form onSubmit={resetPassword} className="grid gap-2">
          <FormField label="Set a new password" hint="Give the new password to the employee.">
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </FormField>
          <Button
            type="submit"
            icon={KeyRound}
            loading={busy === 'password'}
            className="justify-self-start"
          >
            Reset password
          </Button>
        </form>

        <div className="border-t border-line pt-4">
          <Button variant="danger" icon={Trash2} onClick={() => setConfirmRemove(true)}>
            Remove employee
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="Remove this employee?"
        message={`${employee.fullName} will lose access and their simulation history will be deleted. This can’t be undone.`}
        confirmLabel="Remove"
        loading={busy === 'remove'}
        onConfirm={remove}
        onCancel={() => setConfirmRemove(false)}
      />
    </Drawer>
  );
}

function EmployeesPage() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [department, setDepartment] = useState('all');
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState(null);
  const { data, error, loading, reload } = useAsync(loadEmployees);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.employees || []).filter(
      (e) =>
        (department === 'all' || e.departmentName === department) &&
        (!q || e.fullName.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)),
    );
  }, [data, query, department]);

  const departmentOptions = [
    { value: 'all', label: 'All departments' },
    ...(data?.departments || []).map((d) => ({ value: d.name, label: d.name })),
  ];

  const columns = [
    {
      key: 'name',
      header: 'Employee',
      sortValue: (e) => e.fullName,
      render: (e) => (
        <span className="flex items-center gap-3">
          <Avatar name={e.fullName} />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{e.fullName}</span>
            <span className="block truncate text-xs text-ink-3">{e.email}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'dept',
      header: 'Department',
      sortValue: (e) => e.departmentName,
      render: (e) => e.departmentName || '—',
    },
    {
      key: 'tenure',
      header: 'Tenure',
      sortValue: (e) => e.hireDate,
      render: (e) => <span title={formatDate(e.hireDate)}>{tenure(e.hireDate)}</span>,
    },
    {
      key: 'risk',
      header: 'Risk',
      sortValue: (e) => e.score ?? -1,
      render: (e) => <RiskPill level={e.riskLevel} score={toScore(e.score)} />,
    },
    {
      key: 'sims',
      header: 'Simulations',
      sortValue: (e) => e.attempts.clicked,
      render: (e) =>
        e.attempts.total ? (
          <span className="text-ink-2">
            Clicked {e.attempts.clicked} of {e.attempts.total}
          </span>
        ) : (
          <span className="text-ink-3">None yet</span>
        ),
    },
    {
      key: 'training',
      header: 'Training',
      render: (e) => <TrainingStatus training={e.training} />,
    },
  ];

  const open = data?.employees.find((e) => e.id === openId) || null;

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle={
          data
            ? `${data.employees.length} people across ${data.departments.length} departments`
            : 'Loading…'
        }
        actions={
          <Button variant="primary" icon={UserPlus} onClick={() => setAdding(true)}>
            Add Employee
          </Button>
        }
      />
      {error ? (
        <ErrorCard message={error} onRetry={reload} />
      ) : (
        <Card padded={false} index={0}>
          <div className="flex flex-wrap items-center gap-2 px-5 py-4">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search by name or email…"
              className="w-full sm:w-72"
            />
            <DropdownButton
              options={departmentOptions}
              value={department}
              onChange={setDepartment}
            />
          </div>
          <DataTable
            caption="Employees"
            columns={columns}
            rows={rows}
            loading={loading}
            onRowClick={(e) => setOpenId(e.id)}
            empty={
              <EmptyState
                title={data?.employees.length ? 'No one matches this search' : 'No employees yet'}
                description={
                  data?.employees.length
                    ? 'Try another name or department.'
                    : 'Add your team so they can be included in simulations.'
                }
                action={
                  !data?.employees.length && (
                    <Button variant="primary" icon={UserPlus} onClick={() => setAdding(true)}>
                      Add Employee
                    </Button>
                  )
                }
              />
            }
          />
        </Card>
      )}

      <AddEmployeeModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={reload}
        departments={data?.departments || []}
      />
      <EmployeeDrawer employee={open} onClose={() => setOpenId(null)} onChanged={reload} />
    </>
  );
}

export default EmployeesPage;
