import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Lock, Unlock, DollarSign, Clock, TrendingUp,
  ShoppingCart, RefreshCw,
  X, Banknote, BarChart2, RotateCcw,
} from 'lucide-react';
import { useCajaActiva, useAbrirCaja, useCerrarCaja, useHistorialCajas } from '../../queries/cajas.queries';
import { useAuth } from '../../context/AuthContext';
import { useCaja } from '../../context/CajaContext';
import { useToast } from '../../components/Toast/Toast';
import styles from './Cajas.module.css';


/* ── Helpers ── */
const formatCOP = (v) =>
  '$ ' + Number(v).toLocaleString('es-CO', { minimumFractionDigits: 0 });

const formatTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

const tiempoAbierta = (apertura) => {
  if (!apertura) return '—';
  const diff = Date.now() - new Date(apertura).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
};

/* ── Sub-componente: Modal Abrir ── */
function ModalAbrir({ form, onSubmit, onClose, isLoading, handleCOPInput, styles }) {
  const { register, setValue, formState: { errors } } = form;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderIcon}>
            <Unlock size={20} />
          </div>
          <div>
            <h2 className={styles.modalTitle}>Abrir caja</h2>
            <p className={styles.modalSub}>Ingresa el saldo inicial en efectivo</p>
          </div>
          <button className={styles.modalClose} onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={onSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="saldo_inicial">
                Saldo inicial <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputCOPWrap}>
                <span className={styles.inputPrefix}>$</span>
                <input
                  id="saldo_inicial"
                  type="text"
                  inputMode="numeric"
                  className={`${styles.inputCOP} ${errors.saldo_inicial ? styles.inputError : ''}`}
                  placeholder="0"
                  {...register('saldo_inicial', {
                    required: 'El saldo inicial es obligatorio',
                    validate: (v) => Number(String(v).replace(/\./g, '')) >= 0 || 'Ingresa un valor válido',
                  })}
                  onChange={handleCOPInput((v) => setValue('saldo_inicial', v))}
                />
              </div>
              {errors.saldo_inicial && (
                <span className={styles.errorMsg}>{errors.saldo_inicial.message}</span>
              )}
              <p className={styles.inputHint}>Este valor corresponde al efectivo físico en la caja</p>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnGhost} onClick={onClose} disabled={isLoading}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnAbrir} disabled={isLoading}>
              <Unlock size={15} />
              {isLoading ? 'Abriendo...' : 'Abrir caja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Sub-componente: Modal Cerrar ── */
function ModalCerrar({ caja, form, onSubmit, onClose, isLoading, handleCOPInput, formatCOP, formatTime, tiempoAbierta, styles }) {
  const { register, setValue, watch, formState: { errors } } = form;
  const saldoContado = watch('saldo_contado');
  const saldoNum = Number(String(saldoContado || '0').replace(/\./g, ''));
  const diferencia = saldoNum - (caja.saldo_actual ?? 0);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={`${styles.modalHeaderIcon} ${styles.modalHeaderDanger}`}>
            <Lock size={20} />
          </div>
          <div>
            <h2 className={styles.modalTitle}>Cerrar caja</h2>
            <p className={styles.modalSub}>Resumen del día · Caja {caja.id}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={onSubmit}>
          <div className={styles.modalBody}>
            {/* Resumen del día */}
            <div className={styles.resumenGrid}>
              <div className={styles.resumenItem}>
                <span className={styles.resumenLabel}>Hora apertura</span>
                <span className={styles.resumenVal}>{formatTime(caja.apertura)}</span>
              </div>
              <div className={styles.resumenItem}>
                <span className={styles.resumenLabel}>Tiempo abierta</span>
                <span className={styles.resumenVal}>{tiempoAbierta(caja.apertura)}</span>
              </div>
              <div className={styles.resumenItem}>
                <span className={styles.resumenLabel}>Total ventas</span>
                <span className={`${styles.resumenVal} ${styles.resumenGreen}`}>
                  {formatCOP(caja.total_ventas)}
                </span>
              </div>
              <div className={styles.resumenItem}>
                <span className={styles.resumenLabel}>Ventas efectivo</span>
                <span className={styles.resumenVal}>{formatCOP(caja.ventas_efectivo)}</span>
              </div>
              <div className={styles.resumenItem}>
                <span className={styles.resumenLabel}>Transacciones</span>
                <span className={styles.resumenVal}>{caja.transacciones}</span>
              </div>
              {caja.num_devoluciones > 0 && (
                <div className={styles.resumenItem}>
                  <span className={styles.resumenLabel}>Devoluciones ({caja.num_devoluciones})</span>
                  <span className={styles.resumenVal} style={{ color: 'var(--color-error)' }}>
                    -{formatCOP(caja.total_devoluciones)}
                  </span>
                </div>
              )}
              <div className={styles.resumenItem}>
                <span className={styles.resumenLabel}>Neto ventas</span>
                <span className={`${styles.resumenVal} ${styles.resumenGreen}`}>
                  {formatCOP(caja.total_ventas - (caja.total_devoluciones ?? 0))}
                </span>
              </div>
              <div className={styles.resumenItem}>
                <span className={styles.resumenLabel}>Efectivo esperado</span>
                <span className={styles.resumenVal}>{formatCOP(caja.saldo_actual)}</span>
              </div>
            </div>

            {/* Saldo contado */}
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="saldo_contado">
                Efectivo contado en caja <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputCOPWrap}>
                <span className={styles.inputPrefix}>$</span>
                <input
                  id="saldo_contado"
                  type="text"
                  inputMode="numeric"
                  className={`${styles.inputCOP} ${errors.saldo_contado ? styles.inputError : ''}`}
                  placeholder="0"
                  {...register('saldo_contado', {
                    required: 'El saldo contado es obligatorio',
                  })}
                  onChange={handleCOPInput((v) => setValue('saldo_contado', v))}
                />
              </div>
              {errors.saldo_contado && (
                <span className={styles.errorMsg}>{errors.saldo_contado.message}</span>
              )}
            </div>

            {/* Diferencia */}
            {saldoContado && (
              <div className={`${styles.diferenciaBox} ${diferencia < 0 ? styles.diferenciaFaltante : diferencia > 0 ? styles.diferenciaSobrante : styles.diferenciaCero}`}>
                <span>{diferencia < 0 ? 'Faltante' : diferencia > 0 ? 'Sobrante' : 'Cuadre perfecto'}</span>
                <span className={styles.diferenciaVal}>
                  {diferencia === 0 ? '✓' : formatCOP(Math.abs(diferencia))}
                </span>
              </div>
            )}

            {/* Notas */}
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="notas">Notas del cierre</label>
              <input
                id="notas"
                type="text"
                className={styles.formInputBase}
                placeholder="Observaciones opcionales..."
                {...register('notas')}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnGhost} onClick={onClose} disabled={isLoading}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnCerrar} disabled={isLoading}>
              <Lock size={15} />
              {isLoading ? 'Cerrando...' : 'Confirmar cierre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Componente principal ── */
export default function Cajas() {
  const { user }            = useAuth();
  const { refetch: refetchCajaCtx } = useCaja();
  const toast               = useToast();
  const [modalAbrir, setModalAbrir]   = useState(false);
  const [modalCerrar, setModalCerrar] = useState(false);

  // Query caja activa — refetch cada 60s
  const { data, isLoading, isError, refetch, isFetching } = useCajaActiva(user?.tienda_id);
  const caja = data?.caja ?? null;

  // Historial de cajas (últimas 30)
  const { data: historialData } = useHistorialCajas(user?.tienda_id);
  const historialCajas = historialData?.cajas ?? [];
  const cajaAbierta = caja?.estado === 'abierta';

  // Mutations
  const abrirMutation  = useAbrirCaja();
  const cerrarMutation = useCerrarCaja();

  // Form abrir caja
  const formAbrir = useForm({
    defaultValues: { saldo_inicial: '' },
  });

  // Form cerrar caja
  const formCerrar = useForm({
    defaultValues: { saldo_contado: '', notas: '' },
  });

  const handleAbrir = formAbrir.handleSubmit((values) => {
    abrirMutation.mutate(
      {
        tienda_id:    user?.tienda_id,
        base_apertura: Number(String(values.saldo_inicial).replace(/\./g, '')),
      },
      {
        onSuccess: () => {
          toast.success('Caja abierta correctamente');
          refetchCajaCtx();
          setModalAbrir(false);
          formAbrir.reset();
        },
        onError: () => toast.error('Error al abrir la caja'),
      }
    );
  });

  const handleCerrar = formCerrar.handleSubmit((values) => {
    cerrarMutation.mutate(
      {
        id: caja?.id,
        data: {
          saldo_contado: Number(String(values.saldo_contado).replace(/\./g, '')),
          notas: values.notas,
        },
      },
      {
        onSuccess: () => {
          toast.success('Caja cerrada correctamente');
          refetchCajaCtx();
          setModalCerrar(false);
          formCerrar.reset();
        },
        onError: () => toast.error('Error al cerrar la caja'),
      }
    );
  });

  // Formateo en tiempo real para inputs COP
  const handleCOPInput = (setValue) => (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setValue(raw ? Number(raw).toLocaleString('es-CO') : '');
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Cajas</h1>
          <p className={styles.pageSubtitle}>Control de apertura y cierre de caja</p>
        </div>
        <button
          className={styles.refreshBtn}
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw size={14} className={isFetching ? styles.spinning : ''} />
          Actualizar
        </button>
      </div>

      {/* Card estado caja */}
      <div className={`${styles.cajaCard} ${cajaAbierta ? styles.cajaCardOpen : styles.cajaCardClosed}`}>
        {/* Estado indicator */}
        <div className={styles.cajaStatus}>
          <div className={`${styles.statusIcon} ${cajaAbierta ? styles.statusOpen : styles.statusClosed}`}>
            {cajaAbierta ? <Unlock size={28} /> : <Lock size={28} />}
          </div>
          <div>
            <h2 className={styles.cajaTitle}>
              Caja {cajaAbierta ? 'abierta' : 'cerrada'}
            </h2>
            {cajaAbierta ? (
              <p className={styles.cajaSub}>
                Desde las {formatTime(caja?.apertura)} · {tiempoAbierta(caja?.apertura)} en operación
              </p>
            ) : (
              <p className={styles.cajaSub}>No hay caja activa en este momento</p>
            )}
          </div>
          <div className={styles.cajaActions}>
            {cajaAbierta ? (
              <button
                className={styles.btnCerrar}
                onClick={() => setModalCerrar(true)}
              >
                <Lock size={15} />
                Cerrar caja
              </button>
            ) : (
              <button
                className={styles.btnAbrir}
                onClick={() => setModalAbrir(true)}
              >
                <Unlock size={15} />
                Abrir caja
              </button>
            )}
          </div>
        </div>

        {/* Métricas de la caja activa */}
        {cajaAbierta && caja && (
          <div className={styles.cajaMetrics}>
            <div className={styles.metricItem}>
              <div className={styles.metricIcon} style={{ background: 'var(--accent-secondary-15)', color: 'var(--accent-secondary)' }}>
                <DollarSign size={18} />
              </div>
              <div>
                <p className={styles.metricLabel}>Saldo inicial</p>
                <p className={styles.metricVal}>{formatCOP(caja.saldo_inicial)}</p>
              </div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricIcon} style={{ background: 'var(--accent-primary-15)', color: 'var(--accent-primary)' }}>
                <Banknote size={18} />
              </div>
              <div>
                <p className={styles.metricLabel}>Efectivo en caja</p>
                <p className={styles.metricVal}>{formatCOP(caja.saldo_actual)}</p>
              </div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricIcon} style={{ background: 'var(--accent-secondary-15)', color: 'var(--accent-secondary)' }}>
                <TrendingUp size={18} />
              </div>
              <div>
                <p className={styles.metricLabel}>Total ventas del día</p>
                <p className={styles.metricVal}>{formatCOP(caja.total_ventas)}</p>
              </div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricIcon} style={{ background: 'var(--color-warning-15)', color: 'var(--color-warning)' }}>
                <ShoppingCart size={18} />
              </div>
              <div>
                <p className={styles.metricLabel}>Transacciones</p>
                <p className={styles.metricVal}>{caja.transacciones}</p>
              </div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricIcon} style={{ background: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <BarChart2 size={18} />
              </div>
              <div>
                <p className={styles.metricLabel}>Ticket promedio</p>
                <p className={styles.metricVal}>
                  {caja.transacciones > 0
                    ? formatCOP(Math.round(caja.total_ventas / caja.transacciones))
                    : '—'}
                </p>
              </div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricIcon} style={{ background: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <Clock size={18} />
              </div>
              <div>
                <p className={styles.metricLabel}>Tiempo abierta</p>
                <p className={styles.metricVal}>{tiempoAbierta(caja.apertura)}</p>
              </div>
            </div>
            {caja.num_devoluciones > 0 && (
              <div className={styles.metricItem}>
                <div className={styles.metricIcon} style={{ background: 'rgba(247,90,90,0.12)', color: 'var(--color-error)' }}>
                  <RotateCcw size={18} />
                </div>
                <div>
                  <p className={styles.metricLabel}>Devoluciones ({caja.num_devoluciones})</p>
                  <p className={styles.metricVal} style={{ color: 'var(--color-error)' }}>
                    -{formatCOP(caja.total_devoluciones)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Historial de cajas */}
      <div className={styles.historialSection}>
        <h3 className={styles.historialTitle}>Historial de cajas</h3>
        <div className={styles.historialTable}>
          <div className={styles.historialHeader}>
            <span>ID</span>
            <span>Fecha</span>
            <span>Apertura</span>
            <span>Cierre</span>
            <span>Saldo inicial</span>
            <span>Total ventas</span>
            <span>Devoluciones</span>
            <span>Neto</span>
            <span>Trans.</span>
            <span>Estado</span>
          </div>
          {historialCajas.length === 0 ? (
            <div className={styles.historialRow}>
              <span style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>
                No hay cajas registradas
              </span>
            </div>
          ) : historialCajas.map((h) => (
            <div key={h.id} className={styles.historialRow}>
              <span className={styles.historialId}>{h.id}</span>
              <span>{h.fecha}</span>
              <span className={styles.timeCell}>{h.apertura}</span>
              <span className={styles.timeCell}>{h.cierre}</span>
              <span>{formatCOP(h.saldo_inicial)}</span>
              <span className={styles.ventasCell}>{formatCOP(h.total_ventas)}</span>
              <span style={{ color: h.num_devoluciones > 0 ? 'var(--color-error)' : 'var(--text-muted)' }}>
                {h.num_devoluciones > 0 ? `-${formatCOP(h.total_devoluciones)}` : '—'}
              </span>
              <span className={styles.ventasCell}>
                {formatCOP(h.total_ventas - (h.total_devoluciones ?? 0))}
              </span>
              <span className={styles.centeredCell}>{h.transacciones}</span>
              <span>
                <span className={`${styles.estadoBadge} ${styles.estadoCerrada}`}>
                  Cerrada
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Abrir Caja */}
      {modalAbrir && (
        <ModalAbrir
          form={formAbrir}
          onSubmit={handleAbrir}
          onClose={() => { setModalAbrir(false); formAbrir.reset(); }}
          isLoading={abrirMutation.isLoading}
          handleCOPInput={handleCOPInput}
          styles={styles}
        />
      )}

      {/* Modal Cerrar Caja */}
      {modalCerrar && caja && (
        <ModalCerrar
          caja={caja}
          form={formCerrar}
          onSubmit={handleCerrar}
          onClose={() => { setModalCerrar(false); formCerrar.reset(); }}
          isLoading={cerrarMutation.isLoading}
          handleCOPInput={handleCOPInput}
          formatCOP={formatCOP}
          formatTime={formatTime}
          tiempoAbierta={tiempoAbierta}
          styles={styles}
        />
      )}
    </div>
  );
}
