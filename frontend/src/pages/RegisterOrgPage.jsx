import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const initialForm = {
  organizationName: '',
  organizationIndustry: '',
  organizationCounty: '',
  adminFullName: '',
  adminEmail: '',
  adminPassword: '',
};

function RegisterOrgPage() {
  const { registerOrganization } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await registerOrganization(form);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  }

  return (
    <div className="auth-page">
      <h1>Register your organization</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Organization name
          <input name="organizationName" value={form.organizationName} onChange={handleChange} required />
        </label>
        <label>
          Industry
          <input name="organizationIndustry" value={form.organizationIndustry} onChange={handleChange} />
        </label>
        <label>
          County
          <input name="organizationCounty" value={form.organizationCounty} onChange={handleChange} />
        </label>
        <label>
          Admin full name
          <input name="adminFullName" value={form.adminFullName} onChange={handleChange} required />
        </label>
        <label>
          Admin email
          <input name="adminEmail" type="email" value={form.adminEmail} onChange={handleChange} required />
        </label>
        <label>
          Admin password
          <input
            name="adminPassword"
            type="password"
            value={form.adminPassword}
            onChange={handleChange}
            required
            minLength={8}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Create organization</button>
      </form>
      <p>
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}

export default RegisterOrgPage;
