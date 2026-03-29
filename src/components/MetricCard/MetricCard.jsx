import { createContext, useContext } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import styles from './MetricCard.module.css';

const MetricCardContext = createContext(null);

function useMetricCtx() {
  const ctx = useContext(MetricCardContext);
  if (!ctx) throw new Error('MetricCard sub-component must be used inside <MetricCard>');
  return ctx;
}

/* ── Root ── */
function MetricCard({ children, loading = false, accent = 'primary' }) {
  return (
    <MetricCardContext.Provider value={{ loading, accent }}>
      <div className={`${styles.card} ${loading ? styles.loading : ''}`}>
        {children}
      </div>
    </MetricCardContext.Provider>
  );
}

/* ── Icon ── */
function Icon({ children }) {
  const { accent } = useMetricCtx();
  return (
    <div className={`${styles.iconWrap} ${styles[`accent-${accent}`]}`}>
      {children}
    </div>
  );
}

/* ── Label ── */
function Label({ children }) {
  return <p className={styles.label}>{children}</p>;
}

/* ── Value ── */
function Value({ children }) {
  const { loading } = useMetricCtx();
  return (
    <p className={styles.value}>
      {loading ? <span className={styles.skeleton} /> : children}
    </p>
  );
}

/* ── Trend ── */
function Trend({ direction = 'up', value }) {
  const icons = {
    up:      <TrendingUp size={14} />,
    down:    <TrendingDown size={14} />,
    neutral: <Minus size={14} />,
  };
  return (
    <div className={`${styles.trend} ${styles[`trend-${direction}`]}`}>
      {icons[direction]}
      <span>{value}</span>
    </div>
  );
}

MetricCard.Icon  = Icon;
MetricCard.Label = Label;
MetricCard.Value = Value;
MetricCard.Trend = Trend;

export default MetricCard;
