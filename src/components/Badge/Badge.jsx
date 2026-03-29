import styles from './Badge.module.css';

/**
 * variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'
 * También acepta estados DIAN: 'emitida' → success, 'pendiente' → warning, 'error' → error
 */
const DIAN_MAP = {
  emitida:  'success',
  pendiente: 'warning',
  error:    'error',
  anulada:  'neutral',
};

function Badge({ children, variant = 'neutral', dian }) {
  const v = dian ? (DIAN_MAP[dian] ?? 'neutral') : variant;
  return (
    <span className={`${styles.badge} ${styles[v]}`}>
      {dian ? (dian.charAt(0).toUpperCase() + dian.slice(1)) : children}
    </span>
  );
}

export default Badge;
