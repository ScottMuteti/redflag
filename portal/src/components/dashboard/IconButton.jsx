/* eslint-disable react/prop-types -- small presentational component */

function IconButton({ icon: Icon, label, dot = false, onClick }) {
  return (
    <button
      type="button"
      className="d-icon-button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon size={20} strokeWidth={1.75} />
      {dot && <span className="d-icon-dot" aria-hidden="true" />}
    </button>
  );
}

export default IconButton;
