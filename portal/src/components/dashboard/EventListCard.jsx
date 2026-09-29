/* eslint-disable react/prop-types -- small presentational component */
import Badge from './Badge';
import { relativeTime } from '../../lib/format';

// events: [{ id, text, at, impact }] — impact is risk points, so lower is better.
function EventListCard({ title, events, emptyText, index = 0 }) {
  return (
    <section className="d-card d-events" style={{ '--i': index }}>
      <h2 className="d-card-title">{title}</h2>
      {events.length === 0 ? (
        <p className="d-empty">{emptyText}</p>
      ) : (
        <ul>
          {events.map((e) => (
            <li key={e.id}>
              <span className="d-event-bar" aria-hidden="true" />
              <div className="d-event-text">
                <strong title={e.text}>{e.text}</strong>
                <time dateTime={e.at}>{relativeTime(e.at)}</time>
              </div>
              <Badge value={e.impact} invertGood />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default EventListCard;
