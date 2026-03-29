import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  DollarSign, ShoppingCart, BarChart2, Banknote,
  RefreshCw, AlertTriangle, RotateCcw, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import MetricCard from '../../components/MetricCard/MetricCard';
import Table from '../../components/Table/Table';
import { useAuth } from '../../context/AuthContext';
import { useDashboardMetricas, useVentasPorHora } from '../../queries/dashboard.queries';
import { useVentasByTienda } from '../../queries/ventas.queries';
import styles from './Dashboard.module.css';

/* ── Helpers ── */
const formatCOP = (v) =>
  '$ ' + Number(v).toLocaleString('es-CO', { minimumFractionDigits: 0 });

const formatDate = (date) =>
  date.toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

/* ── Tooltip del gráfico ── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#161A23', border: '1px solid #1F2433',
      borderRadius: 8, padding: '10px 14px', fontSize: '0.8125rem', color: '#C9D1E3',
    }}>
      <p style={{ marginBottom: 6, fontWeight: 600 }}>{label}</p>
      <p style={{ color: '#4F6EF7' }}>
        Ventas: <strong>{formatCOP(payload[0]?.value ?? 0)}</strong>
      </p>
      {payload[1] && (
        <p style={{ color: '#6B7A99' }}>
          Transacciones: <strong>{payload[1].value}</strong>
        </p>
      )}
    </div>
  );
}

/* ── TrendBadge: muestra la tendencia real vs ayer ── */
function TrendBadge({ tendencia }) {
  if (!tendencia) return <span className={styles.trendNeutral}>Sin datos de ayer</span>;
  const { pct, dir } = tendencia;
  if (dir === 'up')   return <span className={styles.trendUp}><TrendingUp size={13} /> +{pct}% vs ayer</span>;
  if (dir === 'down') return <span className={styles.trendDown}><TrendingDown size={13} /> {pct}% vs ayer</span>;
  return <span className={styles.trendNeutral}><Minus size={13} /> igual que ayer</span>;
}

/* ── Main ── */
export default function Dashboard() {
  const { user } = useAuth();
  const tiendaId = user?.tienda_id ?? 1;
  const today    = useMemo(() => new Date(), []);
  const fechaHoy = today.toISOString().split('T')[0];

  const { data: metricas, isLoading, isError, refetch, isFetching } =
    useDashboardMetricas(tiendaId);

  const { data: horaData } = useVentasPorHora(tiendaId, fechaHoy);

  const { data: ventasData } = useVentasByTienda(tiendaId, {
    fecha_inicio: fechaHoy,
    fecha_fin:    fechaHoy,
  });

  const chartData = horaData?.data ?? [];
  const ventas    = ventasData?.ventas ?? [];

  const m = metricas ?? {};

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageDate}>{formatDate(today)}</p>
        </div>
        <button
          className={styles.refreshBtn}
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw size={16} className={isFetching ? styles.spinning : ''} />
          Actualizar
        </button>
      </header>

      {/* Métricas principales */}
      <section className={styles.metricsGrid}>
        <MetricCard loading={isLoading} accent="secondary">
          <MetricCard.Icon><DollarSign size={20} /></MetricCard.Icon>
          <MetricCard.Label>Ventas del día</MetricCard.Label>
          <MetricCard.Value>
            {isLoading ? '...' : isError ? '--' : formatCOP(m.ventas_dia ?? 0)}
          </MetricCard.Value>
          <MetricCard.Trend
            direction={m.tendencia_ventas?.dir ?? 'neutral'}
            value={m.tendencia_ventas ? `${m.tendencia_ventas.pct > 0 ? '+' : ''}${m.tendencia_ventas.pct}% vs ayer` : 'Sin datos de ayer'}
          />
        </MetricCard>

        <MetricCard loading={isLoading} accent="primary">
          <MetricCard.Icon><ShoppingCart size={20} /></MetricCard.Icon>
          <MetricCard.Label>Transacciones</MetricCard.Label>
          <MetricCard.Value>
            {isLoading ? '...' : isError ? '--' : (m.transacciones ?? 0)}
          </MetricCard.Value>
          <MetricCard.Trend
            direction={m.tendencia_trans?.dir ?? 'neutral'}
            value={m.tendencia_trans ? `${m.tendencia_trans.pct > 0 ? '+' : ''}${m.tendencia_trans.pct}% vs ayer` : 'Sin datos de ayer'}
          />
        </MetricCard>

        <MetricCard loading={isLoading} accent="warning">
          <MetricCard.Icon><BarChart2 size={20} /></MetricCard.Icon>
          <MetricCard.Label>Ticket promedio</MetricCard.Label>
          <MetricCard.Value>
            {isLoading ? '...' : isError ? '--' : formatCOP(m.ticket_promedio ?? 0)}
          </MetricCard.Value>
          <MetricCard.Trend
            direction={m.tendencia_ticket?.dir ?? 'neutral'}
            value={m.tendencia_ticket ? `${m.tendencia_ticket.pct > 0 ? '+' : ''}${m.tendencia_ticket.pct}% vs ayer` : 'Sin datos de ayer'}
          />
        </MetricCard>

        <MetricCard loading={isLoading} accent="secondary">
          <MetricCard.Icon><Banknote size={20} /></MetricCard.Icon>
          <MetricCard.Label>
            Efectivo en caja
            {!isLoading && !m.caja_abierta && (
              <span className={styles.cajaCerradaTag}>Cerrada</span>
            )}
          </MetricCard.Label>
          <MetricCard.Value>
            {isLoading ? '...' : isError ? '--' : formatCOP(m.efectivo_caja ?? 0)}
          </MetricCard.Value>
          <MetricCard.Trend direction="neutral" value="Saldo actual" />
        </MetricCard>
      </section>

      {/* Alertas */}
      {!isLoading && !isError && (m.stock_critico > 0 || m.num_devoluciones > 0) && (
        <section className={styles.alertasGrid}>
          {m.stock_critico > 0 && (
            <div className={`${styles.alertaCard} ${styles.alertaWarning}`}>
              <AlertTriangle size={18} />
              <div>
                <strong>{m.stock_critico} producto{m.stock_critico > 1 ? 's' : ''}</strong> con stock crítico
                <span className={styles.alertaHint}>— revisar pedidos pendientes</span>
              </div>
            </div>
          )}
          {m.num_devoluciones > 0 && (
            <div className={`${styles.alertaCard} ${styles.alertaInfo}`}>
              <RotateCcw size={18} />
              <div>
                <strong>{m.num_devoluciones} devolución{m.num_devoluciones > 1 ? 'es' : ''}</strong> hoy
                <span className={styles.alertaHint}> — {formatCOP(m.total_devoluciones)} devuelto</span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Gráfico ventas por hora */}
      <div className={styles.chartCard}>
        <p className={styles.chartTitle}>Ventas por hora — hoy</p>
        {chartData.length === 0 && !isLoading ? (
          <p className={styles.chartEmpty}>Sin ventas registradas hoy</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4F6EF7" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4F6EF7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2433" vertical={false} />
              <XAxis dataKey="hora" tick={{ fill: '#6B7A99', fontSize: 11 }}
                axisLine={{ stroke: '#1F2433' }} tickLine={false} />
              <YAxis tick={{ fill: '#6B7A99', fontSize: 11 }} axisLine={false}
                tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={52} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="ventas" stroke="#4F6EF7" strokeWidth={2}
                fill="url(#gradVentas)" dot={false}
                activeDot={{ r: 4, fill: '#4F6EF7', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Últimas ventas del día */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <p className={styles.chartTitle} style={{ marginBottom: 0 }}>Últimas ventas de hoy</p>
          <span className={styles.tableBadge}>{ventas.length} registros</span>
        </div>
        <Table data={ventas} pageSize={8}>
          <Table.Body>
            <Table.Col field="numero_factura" render={(v, row) => (
              <span className={styles.facturaNum}>{v ?? row.id?.slice(0, 8)}</span>
            )}>Factura</Table.Col>
            <Table.Col field="created_at" render={(v) => formatDateTime(v)}>Hora</Table.Col>
            <Table.Col field="total" align="right" render={(v) => formatCOP(v)}>Total</Table.Col>
            <Table.Col field="forma_pago" render={(v) => (
              <span className={styles.metodoPago}>{v ?? '—'}</span>
            )}>Medio de pago</Table.Col>
            <Table.Col field="estado" render={(v) => (
              <span className={`${styles.estadoChip} ${v === 'anulada' ? styles.estadoAnulada : styles.estadoActiva}`}>
                {v === 'anulada' ? 'Anulada' : 'Activa'}
              </span>
            )}>Estado</Table.Col>
            <Table.Col field="estado_fe" render={(v) => (
              v
                ? <span className={styles.feChip}>{v}</span>
                : <span className={styles.posChip}>POS</span>
            )}>Tipo doc.</Table.Col>
          </Table.Body>
          <Table.Empty>No hay ventas registradas hoy</Table.Empty>
          <Table.Pagination />
        </Table>
      </div>
    </div>
  );
}
