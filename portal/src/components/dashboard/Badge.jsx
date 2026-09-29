/* eslint-disable react/prop-types -- small presentational component */
import { formatDelta } from '../../lib/format';

// Delta badge. For vulnerability metrics a decrease is good, so pass invertGood.
function Badge({ value, invertGood = false, children }) {
  let tone = 'neutral';
  if (value > 0) tone = invertGood ? 'negative' : 'positive';
  if (value < 0) tone = invertGood ? 'positive' : 'negative';

  return <span className={`d-badge d-badge-${tone}`}>{children ?? formatDelta(value)}</span>;
}

export default Badge;
