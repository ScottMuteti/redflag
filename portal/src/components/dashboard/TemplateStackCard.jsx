/* eslint-disable react/prop-types -- small presentational component */
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

// Back to front: frosted glass, light red, deep red.
const LAYERS = ['glass', 'rose', 'dark'];

// templates: up to 3 of { name, type: 'sms' | 'email', category }
function TemplateStackCard({ title, description, action, templates, index = 0 }) {
  return (
    <section className="d-card d-templates d-span-2" style={{ '--i': index }}>
      <div className="d-templates-text">
        <h2 className="d-templates-title">{title}</h2>
        <p>{description}</p>
        <Link to={action.to} className="d-button">
          {action.label} <Plus size={16} strokeWidth={2.25} />
        </Link>
      </div>
      <div className="d-stack" aria-label="Template previews">
        {templates.slice(0, 3).map((t, i) => (
          <div key={t.name} className={`d-tcard d-tcard-${LAYERS[i]}`}>
            <div className="d-tcard-top">
              <strong>{t.name}</strong>
              <span className="d-tcard-type">{t.type === 'sms' ? 'SMS' : 'Email'}</span>
            </div>
            <span className="d-tcard-dots" aria-hidden="true">
              •••• •••• ••••
            </span>
            <div className="d-tcard-bottom">
              <span>{t.category || 'Simulation'}</span>
              <span className="d-tcard-circles" aria-hidden="true">
                <i />
                <i />
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TemplateStackCard;
