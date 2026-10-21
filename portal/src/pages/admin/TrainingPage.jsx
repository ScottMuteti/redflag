/* eslint-disable react/prop-types -- page-local components */
import { useMemo, useState } from 'react';
import { BookOpen, Plus, Sparkles, Trash2, UserPlus, X } from 'lucide-react';
import {
  addStarterModules,
  assignTraining,
  createModule,
  deleteModule,
  listAssignments,
  listModules,
  updateModule,
} from '../../api/training';
import { listDepartments, listEmployees } from '../../api/employees';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorCard,
  FormField,
  Input,
  MiniBar,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  Skeleton,
  StatusBadge,
  Tabs,
  Textarea,
  useToast,
} from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPercent } from '../../lib/format';
import { rate } from '../../lib/metrics';

const CATEGORIES = [
  ['', 'None (manual only)'],
  ['mpesa', 'M-Pesa'],
  ['kra', 'KRA'],
  ['safaricom', 'Safaricom'],
  ['invoice', 'Invoice'],
];

const LESSON_LABEL = { read: 'Reading', spot: 'Spot the flags', choice: 'Scenario' };

const blankQuestion = () => ({ question: '', options: ['', '', ''], correctIndex: 0 });

// Title, description, category and a quiz builder. Interactive lessons on starter modules are kept as-is.
function ModuleEditor({ module, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => ({
    title: module?.title || '',
    description: module?.description || '',
    contentUrl: module?.contentUrl || '',
    category: module?.category || '',
    estimatedMinutes: module?.estimatedMinutes || '',
    quiz: module?.quiz?.length ? module.quiz : [blankQuestion()],
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const setQuestion = (qi, changes) =>
    setForm((f) => ({ ...f, quiz: f.quiz.map((q, i) => (i === qi ? { ...q, ...changes } : q)) }));

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required');
    const quiz = form.quiz
      .map((q) => ({ ...q, options: q.options.map((o) => o.trim()).filter(Boolean) }))
      .filter((q) => q.question.trim());
    if (quiz.some((q) => q.options.length < 2 || q.correctIndex >= q.options.length)) {
      return setError('Each question needs at least two options and a correct answer');
    }
    setError('');
    setSaving(true);
    const payload = {
      ...form,
      title: form.title.trim(),
      estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : null,
      quiz,
      lessons: module?.lessons || null,
    };
    try {
      if (module) await updateModule(module.id, payload);
      else await createModule(payload);
      toast.success(module ? 'Module saved' : 'Module created');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save module');
    } finally {
      setSaving(false);
    }
    return undefined;
  }

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={module ? 'Edit module' : 'New training module'}
      description="Employees work through the lessons, then pass the quiz (80%) to complete it."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="module-form" loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <form id="module-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <FormField label="Title" required className="sm:col-span-2">
          <Input value={form.title} onChange={set('title')} />
        </FormField>
        <FormField label="Description" className="sm:col-span-2">
          <Textarea rows={2} value={form.description} onChange={set('description')} />
        </FormField>
        <FormField
          label="Auto-assign after"
          hint="Assigned when someone clicks this kind of simulation"
        >
          <Select value={form.category} onChange={set('category')}>
            {CATEGORIES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Minutes to complete">
          <Input
            type="number"
            min="1"
            value={form.estimatedMinutes}
            onChange={set('estimatedMinutes')}
          />
        </FormField>
        <FormField label="Extra reading link" hint="Optional" className="sm:col-span-2">
          <Input
            type="url"
            value={form.contentUrl}
            onChange={set('contentUrl')}
            placeholder="https://"
          />
        </FormField>

        {module?.lessons?.length > 0 && (
          <div className="rounded-control border border-line bg-page p-3 text-xs text-ink-2 sm:col-span-2">
            <strong className="text-ink">{module.lessons.length} interactive lessons</strong>:{' '}
            {module.lessons.map((l) => `${LESSON_LABEL[l.type]} – ${l.title}`).join(' · ')}
          </div>
        )}

        <div className="grid gap-3 sm:col-span-2">
          <p className="text-xs font-semibold text-ink-2">Quiz</p>
          {form.quiz.map((q, qi) => (
            <fieldset key={qi} className="grid gap-2 rounded-control border border-line p-3">
              <div className="flex items-center gap-2">
                <Input
                  aria-label={`Question ${qi + 1}`}
                  placeholder={`Question ${qi + 1}`}
                  value={q.question}
                  onChange={(e) => setQuestion(qi, { question: e.target.value })}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  icon={X}
                  aria-label="Remove question"
                  onClick={() =>
                    setForm((f) => ({ ...f, quiz: f.quiz.filter((_, i) => i !== qi) }))
                  }
                />
              </div>
              {q.options.map((o, oi) => (
                <label key={oi} className="flex items-center gap-2 text-body">
                  <input
                    type="radio"
                    name={`correct-${qi}`}
                    checked={q.correctIndex === oi}
                    onChange={() => setQuestion(qi, { correctIndex: oi })}
                    aria-label={`Option ${oi + 1} is correct`}
                  />
                  <Input
                    placeholder={`Option ${oi + 1}`}
                    value={o}
                    onChange={(e) =>
                      setQuestion(qi, {
                        options: q.options.map((x, i) => (i === oi ? e.target.value : x)),
                      })
                    }
                  />
                </label>
              ))}
              <p className="text-micro text-ink-3">Select the radio next to the correct answer.</p>
            </fieldset>
          ))}
          <Button
            size="sm"
            icon={Plus}
            className="justify-self-start"
            onClick={() => setForm((f) => ({ ...f, quiz: [...f.quiz, blankQuestion()] }))}
          >
            Add question
          </Button>
        </div>
        {error && <p className="text-xs text-danger sm:col-span-2">{error}</p>}
      </form>
    </Modal>
  );
}

function AssignModal({ modules, departments, employees, initialModuleId, onClose, onSaved }) {
  const toast = useToast();
  const [moduleId, setModuleId] = useState(initialModuleId || modules[0]?.id || '');
  const [target, setTarget] = useState('department');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await assignTraining({
        trainingModuleId: Number(moduleId),
        dueAt: dueAt || undefined,
        ...(target === 'department'
          ? { departmentId: Number(departmentId) }
          : target === 'everyone'
            ? { employeeIds: employees.map((e) => e.id) }
            : { employeeIds: [Number(employeeId)] }),
      });
      toast.success(`Assigned to ${res.assigned ?? 1} ${res.assigned === 1 ? 'person' : 'people'}`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not assign training');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Assign training"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={save} disabled={!moduleId}>
            Assign
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <FormField label="Module">
          <Select value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </Select>
        </FormField>
        <Tabs
          variant="pill"
          label="Assign to"
          value={target}
          onChange={setTarget}
          tabs={[
            { value: 'department', label: 'Department' },
            { value: 'employee', label: 'One person' },
            { value: 'everyone', label: 'Everyone' },
          ]}
        />
        {target === 'department' && (
          <FormField label="Department">
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        {target === 'employee' && (
          <FormField label="Employee">
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        {target === 'everyone' && (
          <p className="text-body text-ink-3">All {employees.length} employees.</p>
        )}
        <FormField label="Due date" hint="Optional">
          <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  );
}

function TrainingPage() {
  const toast = useToast();
  const [tab, setTab] = useState('modules');
  const [editing, setEditing] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, error, loading, reload } = useAsync(() =>
    Promise.all([listModules(), listAssignments(), listDepartments(), listEmployees()]).then(
      ([modules, assignments, departments, employees]) => ({
        modules,
        assignments,
        departments,
        employees,
      }),
    ),
  );

  const assignments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.assignments || []).filter(
      (a) => !q || a.employeeName.toLowerCase().includes(q) || a.title.toLowerCase().includes(q),
    );
  }, [data, query]);

  async function addStarter() {
    setBusy(true);
    try {
      const { added } = await addStarterModules();
      toast.success(
        added ? `Added ${added} interactive modules` : 'Starter modules are already added',
      );
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add modules');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteModule(removing.id);
      toast.success('Module deleted');
      setRemoving(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete module');
    } finally {
      setBusy(false);
    }
  }

  const completed = (data?.assignments || []).filter((a) => a.status === 'completed').length;

  const columns = [
    {
      key: 'employeeName',
      header: 'Employee',
      sortValue: (a) => a.employeeName,
      render: (a) => (
        <span className="block">
          <span className="block font-semibold">{a.employeeName}</span>
          <span className="block text-xs text-ink-3">{a.departmentName || 'No department'}</span>
        </span>
      ),
    },
    { key: 'title', header: 'Module', sortValue: (a) => a.title },
    {
      key: 'status',
      header: 'Status',
      sortValue: (a) => a.status,
      render: (a) => <StatusBadge status={a.status} />,
    },
    {
      key: 'score',
      header: 'Quiz',
      align: 'right',
      sortValue: (a) => (a.lastScore === null ? -1 : Number(a.lastScore)),
      render: (a) =>
        a.lastScore === null ? (
          <span className="text-ink-3">—</span>
        ) : (
          <span>
            {formatPercent(Number(a.lastScore))}
            <span className="text-xs text-ink-3"> · {a.quizAttempts} tries</span>
          </span>
        ),
    },
    {
      key: 'assignedAt',
      header: 'Assigned',
      sortValue: (a) => a.assignedAt,
      render: (a) => formatDate(a.assignedAt),
    },
    { key: 'dueAt', header: 'Due', sortValue: (a) => a.dueAt, render: (a) => formatDate(a.dueAt) },
  ];

  return (
    <>
      <PageHeader
        title="Training"
        subtitle={
          data
            ? `${data.modules.length} modules · ${completed}/${data.assignments.length} assignments completed`
            : 'Remedial training and quizzes'
        }
        actions={
          <>
            <Button icon={Sparkles} loading={busy} onClick={addStarter}>
              Add starter modules
            </Button>
            <Button
              icon={UserPlus}
              disabled={!data?.modules.length}
              onClick={() => setAssigning({})}
            >
              Assign
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => setEditing({})}>
              New module
            </Button>
          </>
        }
      />
      {error && <ErrorCard message={error} onRetry={reload} />}

      <Tabs
        label="Training sections"
        value={tab}
        onChange={setTab}
        className="mb-4"
        tabs={[
          { value: 'modules', label: 'Modules', count: data?.modules.length },
          { value: 'assignments', label: 'Assignments', count: data?.assignments.length },
        ]}
      />

      {tab === 'modules' &&
        (loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-44 rounded-card" />
            <Skeleton className="h-44 rounded-card" />
          </div>
        ) : data?.modules.length === 0 ? (
          <Card>
            <EmptyState
              icon={BookOpen}
              title="No training modules yet"
              description="Add the interactive starter modules, or build your own."
              action={
                <Button variant="primary" icon={Sparkles} onClick={addStarter} loading={busy}>
                  Add starter modules
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data?.modules.map((m, i) => (
              <Card key={m.id} index={i} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-label font-semibold text-ink">{m.title}</h2>
                  {m.category && (
                    <Badge tone="brand" className="capitalize">
                      {m.category}
                    </Badge>
                  )}
                </div>
                {m.description && <p className="mt-1 text-body text-ink-2">{m.description}</p>}
                <p className="mt-2 text-xs text-ink-3">
                  {m.lessons?.length || 0} lessons · {m.quiz?.length || 0} questions
                  {m.estimatedMinutes ? ` · ~${m.estimatedMinutes} min` : ''}
                </p>
                <div className="mt-auto pt-4">
                  <div className="mb-1 flex justify-between text-xs text-ink-3">
                    <span>Completed</span>
                    <span>
                      {m.completedCount}/{m.assignedCount}
                    </span>
                  </div>
                  <MiniBar
                    value={rate(m.completedCount, m.assignedCount)}
                    label={`${m.title} completion`}
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setEditing(m)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      icon={UserPlus}
                      onClick={() => setAssigning({ moduleId: m.id })}
                    >
                      Assign
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      aria-label={`Delete ${m.title}`}
                      onClick={() => setRemoving(m)}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}

      {tab === 'assignments' && (
        <Card padded={false}>
          <div className="px-5 py-4">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search employee or module…"
              className="w-full sm:w-72"
            />
          </div>
          <DataTable
            caption="Training assignments"
            columns={columns}
            rows={assignments}
            loading={loading}
            empty={
              <EmptyState
                title="No assignments"
                description="Training is assigned automatically when someone clicks a simulation, or you can assign it."
              />
            }
          />
        </Card>
      )}

      {editing && (
        <ModuleEditor
          module={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
      {assigning && data && (
        <AssignModal
          modules={data.modules}
          departments={data.departments}
          employees={data.employees}
          initialModuleId={assigning.moduleId}
          onClose={() => setAssigning(null)}
          onSaved={reload}
        />
      )}
      <ConfirmDialog
        open={Boolean(removing)}
        title="Delete this module?"
        message={removing ? `“${removing.title}” and all its assignments will be removed.` : ''}
        confirmLabel="Delete"
        loading={busy}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}

export default TrainingPage;
