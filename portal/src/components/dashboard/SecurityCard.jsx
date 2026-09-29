/* eslint-disable react/prop-types -- small presentational component */
import { Link } from 'react-router-dom';
import { Fingerprint } from 'lucide-react';

function SecurityCard({ title, subtitle, action, index = 0 }) {
  return (
    <section className="d-card d-security" style={{ '--i': index }}>
      <span className="d-security-icon" aria-hidden="true">
        <Fingerprint size={48} strokeWidth={1.5} />
      </span>
      <h2 className="d-card-title">{title}</h2>
      <p>{subtitle}</p>
      <Link to={action.to} className="d-button d-button-block">
        {action.label}
      </Link>
    </section>
  );
}

export default SecurityCard;
