import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Field } from '../components/ui';
import AuthLayout from './AuthLayout';

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
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await registerOrganization(form);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <h1>Register your organization</h1>
      <p>Set up your workspace and admin account.</p>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <span className="form-section-label">Organization</span>
          <Field label="Organization name" wide>
            <input
              name="organizationName"
              value={form.organizationName}
              onChange={handleChange}
              required
            />
          </Field>
          <Field label="Industry">
            <input
              name="organizationIndustry"
              value={form.organizationIndustry}
              onChange={handleChange}
              placeholder="e.g. Banking"
            />
          </Field>
          <Field label="County">
            <input
              name="organizationCounty"
              value={form.organizationCounty}
              onChange={handleChange}
              placeholder="e.g. Nairobi"
            />
          </Field>
          <span className="form-section-label">Admin account</span>
          <Field label="Full name" wide>
            <input
              name="adminFullName"
              value={form.adminFullName}
              onChange={handleChange}
              required
            />
          </Field>
          <Field label="Email" wide>
            <input
              name="adminEmail"
              type="email"
              value={form.adminEmail}
              onChange={handleChange}
              required
            />
          </Field>
          <Field label="Password (min 8 characters)" wide>
            <input
              name="adminPassword"
              type="password"
              value={form.adminPassword}
              onChange={handleChange}
              required
              minLength={8}
            />
          </Field>
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create organization'}
        </button>
      </form>
      <p className="auth-switch">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

export default RegisterOrgPage;
