// Joins truthy class names.
export const cn = (...classes) => classes.filter(Boolean).join(' ');
