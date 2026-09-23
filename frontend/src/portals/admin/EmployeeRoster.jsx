import { useEffect, useState } from 'react';
import { listEmployees, listDepartments, createEmployee } from '../../api/employees';

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

  if (loading) return <p>Loading…</p>;

  return (
    <section>
      <h2>Employee roster</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Title</th>
            <th>Hire date</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id}>
              <td>{emp.fullName}</td>
              <td>{emp.email}</td>
              <td>{emp.departmentName || '—'}</td>
              <td>{emp.jobTitle || '—'}</td>
              <td>{emp.hireDate ? emp.hireDate.slice(0, 10) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Add employee</h3>
      <form onSubmit={handleSubmit} className="employee-form">
        <input name="fullName" placeholder="Full name" value={form.fullName} onChange={handleChange} required />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input name="phoneNumber" placeholder="Phone number" value={form.phoneNumber} onChange={handleChange} />
        <input name="jobTitle" placeholder="Job title" value={form.jobTitle} onChange={handleChange} />
        <input name="hireDate" type="date" value={form.hireDate} onChange={handleChange} />
        <input
          name="departmentName"
          placeholder="Department"
          list="department-options"
          value={form.departmentName}
          onChange={handleChange}
        />
        <datalist id="department-options">
          {departments.map((dept) => (
            <option key={dept.id} value={dept.name} />
          ))}
        </datalist>
        <input
          name="initialPassword"
          type="password"
          placeholder="Initial password (min 8 chars)"
          value={form.initialPassword}
          onChange={handleChange}
          required
          minLength={8}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">Add employee</button>
      </form>
    </section>
  );
}

export default EmployeeRoster;
