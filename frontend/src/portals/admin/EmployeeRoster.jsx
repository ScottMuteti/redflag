import { useEffect, useState } from 'react';
import { listEmployees, listDepartments, createEmployee } from '../../api/employees';
import { computeScore } from '../../api/scoring';
import { Card, Empty, Field, Loading, PageHeader, RiskBadge } from '../../components/ui';

const emptyForm = {
  fullName: '',
  email: '',
  phoneNumber: '',
  jobTitle: '',
  hireDate: '',
  departmentName: '',
  initialPassword: '',
};

function EmployeeRoster() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState({});
  const [computingId, setComputingId] = useState(null);

  async function refresh() {
    const [emps, depts] = await Promise.all([listEmployees(), listDepartments()]);
    setEmployees(emps);
    setDepartments(depts);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await createEmployee(form);
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create employee');
    }
  }

  async function handleComputeScore(employeeId) {
    setError('');
    setComputingId(employeeId);
    try {
      const result = await computeScore(employeeId);
      setScores((prev) => ({ ...prev, [employeeId]: result }));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not compute score');
    } finally {
      setComputingId(null);
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="stack">
      <PageHeader
        title="Employees"
        subtitle={`${employees.length} ${employees.length === 1 ? 'person' : 'people'} across ${departments.length} ${departments.length === 1 ? 'department' : 'departments'}`}
      />

      <Card className="card-flush">
        {employees.length === 0 ? (
          <Empty title="No employees yet">Add your first employee below.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Title</th>
                  <th>Hire date</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <span className="cell-main">{emp.fullName}</span>
                      <span className="cell-sub">{emp.email}</span>
                    </td>
                    <td>{emp.departmentName || <span className="dash">—</span>}</td>
                    <td>{emp.jobTitle || <span className="dash">—</span>}</td>
                    <td>
                      {emp.hireDate ? emp.hireDate.slice(0, 10) : <span className="dash">—</span>}
                    </td>
                    <td>
                      {scores[emp.id] ? (
                        <RiskBadge
                          level={scores[emp.id].riskLevel}
                          score={Number(scores[emp.id].score)}
                        />
                      ) : (
                        <button
                          type="button"
                          className="btn-sm"
                          onClick={() => handleComputeScore(emp.id)}
                          disabled={computingId === emp.id}
                        >
                          {computingId === emp.id ? 'Scoring…' : 'Compute score'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Add employee"
        subtitle="They can sign in to the employee portal with the initial password."
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <Field label="Full name">
            <input name="fullName" value={form.fullName} onChange={handleChange} required />
          </Field>
          <Field label="Email">
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </Field>
          <Field label="Phone number">
            <input
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={handleChange}
              placeholder="+2547…"
            />
          </Field>
          <Field label="Job title">
            <input name="jobTitle" value={form.jobTitle} onChange={handleChange} />
          </Field>
          <Field label="Department">
            <input
              name="departmentName"
              list="department-options"
              value={form.departmentName}
              onChange={handleChange}
            />
          </Field>
          <datalist id="department-options">
            {departments.map((dept) => (
              <option key={dept.id} value={dept.name} />
            ))}
          </datalist>
          <Field label="Hire date">
            <input name="hireDate" type="date" value={form.hireDate} onChange={handleChange} />
          </Field>
          <Field label="Initial password">
            <input
              name="initialPassword"
              type="password"
              value={form.initialPassword}
              onChange={handleChange}
              placeholder="Min 8 characters"
              required
              minLength={8}
            />
          </Field>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Add employee
            </button>
            {error && <p className="error">{error}</p>}
          </div>
        </form>
      </Card>
    </div>
  );
}

export default EmployeeRoster;
