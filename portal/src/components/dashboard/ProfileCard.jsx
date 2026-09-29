/* eslint-disable react/prop-types -- small presentational component */
import { formatNumber, initialsOf } from '../../lib/format';

// stats: [{ label, value }]
function ProfileCard({ name, email, stats, index = 0 }) {
  return (
    <section className="d-card d-profile" style={{ '--i': index }}>
      <span className="d-profile-avatar" aria-hidden="true">
        {initialsOf(name) || '?'}
      </span>
      <strong className="d-profile-name">{name}</strong>
      <span className="d-profile-email">{email}</span>
      <dl className="d-profile-stats">
        {stats.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{formatNumber(s.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default ProfileCard;
