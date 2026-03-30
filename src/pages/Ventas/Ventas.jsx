import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  RefreshCw, Banknote, CreditCard, ArrowLeftRight, Layers,
  MoreHorizontal, Eye, FileDown, Mail, Ban, X, AlertTriangle, RotateCcw, Package,
} from 'lucide-react';
import { useVentasByTienda, useVentaDetail, useAnularVenta } from '../../queries/ventas.queries';
import { useReenviarEmail } from '../../queries/factus.queries';
import { getFacturaPDF } from '../../api/factus.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast/Toast';
import Badge from '../../components/Badge/Badge';
import Table from '../../components/Table/Table';
import styles from './Ventas.module.css';

/* ── Helpers ── */
const formatCOP = (v) =>
  '$ ' + Number(v).toLocaleString('es-CO', { minimumFractionDigits: 0 });

const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

/* ── EstadoBadge ── */
function EstadoBadge({ estado }) {
  if (estado === 'anulada') {
    return <span className={`${styles.estadoBadge} ${styles.estadoAnulada}`}>Anulada</span>;
  }
  return <span className={`${styles.estadoBadge} ${styles.estadoActiva}`}>Activa</span>;
}

/* ── PayBadge ── */
const PAY_ICONS = {
  efectivo:      <Banknote size={13} />,
  tarjeta:       <CreditCard size={13} />,
  transferencia: <ArrowLeftRight size={13} />,
  mixto:         <Layers size={13} />,
};
function PayBadge({ type }) {
  return (
    <span className={styles.payBadge}>
      {PAY_ICONS[type] ?? null}
      {type ? type.charAt(0).toUpperCase() + type.slice(1) : '—'}
    </span>
  );
}

/* ── ActionsMenu ── */
function ActionsMenu({ venta, onDetalle, onAnular, onPDF, onEmail }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className={styles.actionsWrap} ref={ref} onClick={(e) => e.stopPropagation()}>
      <button className={styles.actionsBtn} onClick={() => setOpen(v => !v)}>
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className={styles.actionsMenu}>
          <button onClick={() => { onDetalle(); setOpen(false); }}>
            <Eye size={14} /> Ver detalle
          </button>
          {venta.estado_fe === 'emitida' && (
            <button onClick={() => { onPDF(); setOpen(false); }}>
              <FileDown size={14} /> Descargar PDF
            </button>
          )}
          {venta.estado_fe === 'emitida' && (
            <button onClick={() => { onEmail(); setOpen(false); }}>
              <Mail size={14} /> Reenviar email
            </button>
          )}
          {venta.estado !== 'anulada' && (
            <button className={styles.menuDanger} onClick={() => { onAnular(); setOpen(false); }}>
              <Ban size={14} /> Anular venta
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── DevBadge ── */
function DevBadge() {
  return <span className={styles.devBadge}><RotateCcw size={11} /> Devolución</span>;
}

/* ── DevolucionSection ── */
function DevolucionSection({ devoluciones }) {
  if (!devoluciones?.length) return null;
  return (
    <div className={styles.devSection}>
      <div className={styles.devSectionHeader}>
        <RotateCcw size={15} />
        <span>Devoluciones / Cambios</span>
        <span className={styles.devCount}>{devoluciones.length}</span>
      </div>
      {devoluciones.map((d) => (
        <div key={d.id} className={styles.devCard}>
          <div className={styles.devCardTop}>
            <span className={`${styles.devTipoBadge} ${d.tipo === 'cambio' ? styles.devTipoCambio : styles.devTipoDevolucion}`}>
              {d.tipo === 'cambio' ? 'Cambio' : 'Devolución'}
            </span>
            <span className={styles.devFecha}>{formatDateTime(d.creado_en)}</span>
          </div>
          {d.motivo && <p className={styles.devMotivo}>"{d.motivo}"</p>}
          {d.items_devueltos?.length > 0 && (
            <div className={styles.devItems}>
              {d.items_devueltos.map((item, i) => (
                <div key={i} className={styles.devItemRow}>
                  <Package size={12} />
                  <span>{item.nombre}</span>
                  <span className={styles.devItemCant}>x{item.cantidad}</span>
                </div>
              ))}
            </div>
          )}
          {d.diferencia_precio != null && d.diferencia_precio !== 0 && (
            <div className={`${styles.devDif} ${Number(d.diferencia_precio) >= 0 ? styles.devDifPos : styles.devDifNeg}`}>
              {Number(d.diferencia_precio) >= 0
                ? `Reembolso: ${formatCOP(d.diferencia_precio)}`
                : `Cobro adicional: ${formatCOP(Math.abs(d.diferencia_precio))}`}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── ModalDetalle ── */
function ModalDetalle({ venta, onClose, onAnular, onPDF }) {
  const { data: detalle, isLoading, refetch } = useVentaDetail(venta.id);
  const ventaData    = detalle?.venta ?? venta;
  const items        = detalle?.items ?? [];
  const fe           = detalle?.factura_electronica;
  const cliente      = detalle?.cliente;
  const devoluciones = detalle?.devoluciones ?? [];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalLg} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Detalle de venta</h2>
            <p className={styles.modalSubtitle}>{ventaData.numero_factura ?? ventaData.id}</p>
          </div>
          <div className={styles.modalHeaderRight}>
            <EstadoBadge estado={ventaData.estado} />
            {devoluciones.length > 0 && <DevBadge />}
            {fe?.estado
              ? <Badge dian={fe.estado} />
              : <span className={styles.posLabel}>POS Normal</span>
            }
            <button className={styles.modalClose} onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {isLoading ? (
            <div className={styles.modalLoading}>Cargando detalle...</div>
          ) : (
            <>
              {/* Nota Crédito (solo ventas anuladas con FE) — va primero para que sea visible */}
              {ventaData.estado === 'anulada' && fe && (
                <div className={styles.ncSection}>
                  <div className={styles.ncHeader}>
                    <RotateCcw size={15} />
                    <span>Nota Crédito DIAN</span>
                    {fe.nota_credito && <span className={styles.ncBadge}>Emitida ✓</span>}
                  </div>
                  {fe.nota_credito ? (
                    <div className={styles.ncBody}>
                      <div className={styles.ncRow}>
                        <span className={styles.ncLabel}>Número NC</span>
                        <span className={styles.ncNumero}>{fe.nota_credito}</span>
                      </div>
                      {fe.nc_cude && (
                        <div className={styles.ncRow}>
                          <span className={styles.ncLabel}>CUDE</span>
                          <span className={styles.detalleCufe}>{fe.nc_cude}</span>
                        </div>
                      )}
                      {fe.nc_public_url && (
                        <div className={styles.ncRow}>
                          <span className={styles.ncLabel}>Verificar en DIAN</span>
                          <a
                            href={fe.nc_public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.ncLink}
                          >
                            Ver documento →
                          </a>
                        </div>
                      )}
                    </div>
                  ) : fe.error_mensaje?.startsWith('NC Error:') ? (
                    <div className={styles.ncError}>
                      <span>Error al emitir la Nota Crédito en la DIAN</span>
                      <span className={styles.ncErrorMsg}>{fe.error_mensaje.replace('NC Error: ', '')}</span>
                      <button className={styles.ncRefreshBtn} onClick={refetch} disabled={isLoading}>
                        <RefreshCw size={13} className={isLoading ? styles.spinning : ''} />
                        Reintentar consulta
                      </button>
                    </div>
                  ) : (
                    <div className={styles.ncPendiente}>
                      <span>En proceso de emisión ante la DIAN...</span>
                      <button className={styles.ncRefreshBtn} onClick={refetch} disabled={isLoading}>
                        <RefreshCw size={13} className={isLoading ? styles.spinning : ''} />
                        Verificar estado
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Info general */}
              <div className={styles.detalleGrid}>
                <div className={styles.detalleItem}>
                  <span className={styles.detalleLabel}>Fecha</span>
                  <span className={styles.detalleVal}>{formatDateTime(ventaData.created_at)}</span>
                </div>
                <div className={styles.detalleItem}>
                  <span className={styles.detalleLabel}>Forma de pago</span>
                  <span className={styles.detalleVal}>{ventaData.forma_pago ?? '—'}</span>
                </div>
                <div className={styles.detalleItem}>
                  <span className={styles.detalleLabel}>Cajero</span>
                  <span className={styles.detalleVal}>{ventaData.usuario ?? '—'}</span>
                </div>
                {fe && (
                  <div className={styles.detalleItem}>
                    <span className={styles.detalleLabel}>CUFE</span>
                    <span className={styles.detalleCufe}>{fe.cufe ?? '—'}</span>
                  </div>
                )}
              </div>

              {/* Cliente FE */}
              {cliente && (
                <div className={styles.clienteSection}>
                  <p className={styles.sectionTitle}>Cliente</p>
                  <div className={styles.clienteGrid}>
                    <div className={styles.detalleItem}>
                      <span className={styles.detalleLabel}>Nombre</span>
                      <span className={styles.detalleVal}>{cliente.names ?? '—'}</span>
                    </div>
                    <div className={styles.detalleItem}>
                      <span className={styles.detalleLabel}>Identificación</span>
                      <span className={styles.detalleVal}>{cliente.identification ?? '—'}</span>
                    </div>
                    {cliente.email && (
                      <div className={styles.detalleItem}>
                        <span className={styles.detalleLabel}>Email</span>
                        <span className={styles.detalleVal}>{cliente.email}</span>
                      </div>
                    )}
                    {cliente.phone && (
                      <div className={styles.detalleItem}>
                        <span className={styles.detalleLabel}>Teléfono</span>
                        <span className={styles.detalleVal}>{cliente.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Items */}
              <div className={styles.itemsSection}>
                <p className={styles.sectionTitle}>Productos</p>
                <div className={styles.itemsTable}>
                  <div className={styles.itemsHeader}>
                    <span>Producto</span>
                    <span>Cant.</span>
                    <span>Precio unit.</span>
                    <span>Subtotal</span>
                  </div>
                  {items.length === 0 ? (
                    <div className={styles.itemRow}>
                      <span>Sin detalle disponible</span>
                      <span>—</span><span>—</span><span>—</span>
                    </div>
                  ) : items.map((item, i) => (
                    <div key={i} className={styles.itemRow}>
                      <span>{item.nombre ?? item.producto_id}</span>
                      <span>{item.cantidad}</span>
                      <span>{formatCOP(item.precio_unitario)}</span>
                      <span>{formatCOP(item.precio_unitario * item.cantidad)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Devoluciones */}
              <DevolucionSection devoluciones={devoluciones} />

              {/* Totales */}
              <div className={styles.modalTotals}>
                {ventaData.valor_efectivo > 0 && (
                  <div className={styles.modalTotalRow}>
                    <span>Efectivo</span>
                    <span>{formatCOP(ventaData.valor_efectivo)}</span>
                  </div>
                )}
                {ventaData.valor_tarjeta > 0 && (
                  <div className={styles.modalTotalRow}>
                    <span>Tarjeta</span>
                    <span>{formatCOP(ventaData.valor_tarjeta)}</span>
                  </div>
                )}
                {ventaData.valor_transferencia > 0 && (
                  <div className={styles.modalTotalRow}>
                    <span>Transferencia</span>
                    <span>{formatCOP(ventaData.valor_transferencia)}</span>
                  </div>
                )}
                {ventaData.cambio > 0 && (
                  <div className={styles.modalTotalRow}>
                    <span>Cambio</span>
                    <span>{formatCOP(ventaData.cambio)}</span>
                  </div>
                )}
                <div className={`${styles.modalTotalRow} ${styles.modalTotalFinal}`}>
                  <span>Total</span>
                  <span>{formatCOP(ventaData.total)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button className={styles.btnGhost} onClick={onClose}>Cerrar</button>
          {fe?.estado === 'emitida' && (
            <button className={styles.btnSecondary} onClick={onPDF}>
              <FileDown size={15} /> Descargar PDF
            </button>
          )}
          {venta.estado !== 'anulada' && (
            <button className={styles.btnDanger} onClick={onAnular}>
              <Ban size={15} /> Anular venta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── ModalAnular ── */
function ModalAnular({ venta, isLoading, onConfirm, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalSm} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Anular venta</h2>
          <button className={styles.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.warningIcon}><AlertTriangle size={40} /></div>
          <p className={styles.warningText}>
            ¿Estás seguro de anular la venta <strong>{venta?.id}</strong>?
            Esta acción no se puede deshacer y anulará también la factura electrónica en la DIAN.
          </p>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnGhost} onClick={onClose} disabled={isLoading}>Cancelar</button>
          <button className={styles.btnDanger} onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Anulando...' : 'Sí, anular venta'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
function Ventas() {
  const { user } = useAuth();
  const toast = useToast();

  const [selectedVenta, setSelectedVenta] = useState(null);
  const [ventaAnular, setVentaAnular]     = useState(null);
  const [detalleOpen, setDetalleOpen]     = useState(false);
  const [anularOpen, setAnularOpen]       = useState(false);

  /* Date helpers — Colombia timezone (UTC-5) */
  const toColDate = (date = new Date()) =>
    date.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

  const getColYear  = () => new Date().toLocaleString('en-CA', { timeZone: 'America/Bogota', year: 'numeric' });
  const getColMonth = () => new Date().toLocaleString('en-CA', { timeZone: 'America/Bogota', month: '2-digit' });

  const today = toColDate();

  const { register, watch, setValue } = useForm({
    defaultValues: {
      fecha_inicio: today,
      fecha_fin:    today,
    },
  });
  const fecha_inicio = watch('fecha_inicio');
  const fecha_fin    = watch('fecha_fin');

  const aplicarFiltro = (inicio, fin) => {
    setValue('fecha_inicio', inicio);
    setValue('fecha_fin',    fin);
  };

  const filtroHoy = () => aplicarFiltro(today, today);

  const filtroEsteMes = () => {
    const year  = getColYear();
    const month = getColMonth();
    const ultimo = new Date(year, parseInt(month), 0); // último día del mes
    aplicarFiltro(`${year}-${month}-01`, toColDate(ultimo));
  };

  const filtroMesPasado = () => {
    const now   = new Date();
    const col   = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    const year  = col.getMonth() === 0 ? col.getFullYear() - 1 : col.getFullYear();
    const month = col.getMonth() === 0 ? 12 : col.getMonth(); // getMonth() es 0-indexed
    const mm    = String(month).padStart(2, '0');
    const ultimo = new Date(year, month, 0);
    aplicarFiltro(`${year}-${mm}-01`, toColDate(ultimo));
  };

  const filtroEsteAnio = () => {
    const year = getColYear();
    aplicarFiltro(`${year}-01-01`, `${year}-12-31`);
  };

  const { data, isLoading, isError, refetch } = useVentasByTienda(user?.tienda_id, {
    fecha_inicio,
    fecha_fin,
  });
  const ventas = data?.ventas ?? [];

  const anularMutation  = useAnularVenta();
  const reenviarMutation = useReenviarEmail();

  const handleDescargarPDF = async (id) => {
    try {
      const blob = await getFacturaPDF(id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `factura-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF descargado');
    } catch {
      toast.error('No se pudo descargar el PDF');
    }
  };

  const handleReenviarEmail = (id) => {
    reenviarMutation.mutate(id, {
      onSuccess: () => toast.success('Email reenviado correctamente'),
      onError:   () => toast.error('No se pudo reenviar el email'),
    });
  };

  const handleAnular = (id) => {
    anularMutation.mutate(id, {
      onSuccess: (data) => {
        if (data?.nota_credito === 'pendiente') {
          toast.success('Venta anulada — Nota Crédito en proceso de emisión ante la DIAN');
        } else {
          toast.success('Venta anulada correctamente');
        }
        setAnularOpen(false);
        setVentaAnular(null);
        setSelectedVenta(null);
      },
      onError: () => toast.error('Error al anular la venta'),
    });
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Ventas</h1>
          <p className={styles.pageSubtitle}>Historial de transacciones</p>
        </div>
        <button className={styles.refreshBtn} onClick={refetch} disabled={isLoading}>
          <RefreshCw size={15} className={isLoading ? styles.spinning : ''} />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className={styles.filtersCard}>
        <div className={styles.quickFilters}>
          <button type="button" className={styles.qfBtn} onClick={filtroHoy}>Hoy</button>
          <button type="button" className={styles.qfBtn} onClick={filtroEsteMes}>Este mes</button>
          <button type="button" className={styles.qfBtn} onClick={filtroMesPasado}>Mes pasado</button>
          <button type="button" className={styles.qfBtn} onClick={filtroEsteAnio}>Este año</button>
        </div>
        <div className={styles.filtersRow}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Desde</label>
            <input type="date" className={styles.dateInput} {...register('fecha_inicio')} />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Hasta</label>
            <input type="date" className={styles.dateInput} {...register('fecha_fin')} />
          </div>
          <div className={styles.filterStats}>
            <span className={styles.statChip}>
              {ventas.length} ventas
            </span>
            <span className={`${styles.statChip} ${styles.statGreen}`}>
              {formatCOP(ventas.reduce((a, v) => a + v.total, 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Estado de carga / error */}
      {isError && (
        <div className={styles.errorBanner}>
          No se pudieron cargar las ventas. Verifica la conexión con el servidor.
        </div>
      )}

      {/* Tabla */}
      <div className={styles.tableCard}>
        {isLoading ? (
          <p className={styles.loadingMsg}>Cargando ventas...</p>
        ) : (
        <Table data={ventas} onRowClick={(v) => { setSelectedVenta(v); setDetalleOpen(true); }} pageSize={10}>
          <Table.Body>
            <Table.Col field="id">ID</Table.Col>
            <Table.Col field="created_at" render={(v) => formatDateTime(v)}>Fecha y hora</Table.Col>
            <Table.Col field="total" align="right" render={(v) => formatCOP(v)}>Total</Table.Col>
            <Table.Col field="estado" render={(v, row) => (
                <span className={styles.estadoCell}>
                  <EstadoBadge estado={v} />
                  {row.tiene_devolucion && <DevBadge />}
                </span>
              )}>Estado</Table.Col>
            <Table.Col field="forma_pago" render={(v) => <PayBadge type={v} />}>Forma de pago</Table.Col>
            <Table.Col field="estado_fe" render={(v) => v
              ? <Badge dian={v} />
              : <span className={styles.posLabel}>POS</span>
            }>Tipo doc.</Table.Col>
            <Table.Col field="estado" align="right" render={(_, row) => (
              <ActionsMenu
                venta={row}
                onDetalle={() => { setSelectedVenta(row); setDetalleOpen(true); }}
                onAnular={() => { setVentaAnular(row); setAnularOpen(true); }}
                onPDF={() => handleDescargarPDF(row.id)}
                onEmail={() => handleReenviarEmail(row.id)}
              />
            )}>Acciones</Table.Col>
          </Table.Body>
          <Table.Empty>No hay ventas para el período seleccionado</Table.Empty>
          <Table.Pagination />
        </Table>
        )}
      </div>

      {/* Modal Detalle */}
      {detalleOpen && selectedVenta && (
        <ModalDetalle
          venta={selectedVenta}
          onClose={() => { setDetalleOpen(false); setSelectedVenta(null); }}
          onAnular={() => { setAnularOpen(true); setDetalleOpen(false); }}
          onPDF={() => handleDescargarPDF(selectedVenta.id)}
        />
      )}

      {/* Modal Confirmar Anular */}
      {anularOpen && (ventaAnular || selectedVenta) && (
        <ModalAnular
          venta={ventaAnular ?? selectedVenta}
          isLoading={anularMutation.isLoading}
          onConfirm={() => handleAnular(ventaAnular?.id ?? selectedVenta?.id)}
          onClose={() => { setAnularOpen(false); setVentaAnular(null); }}
        />
      )}
    </div>
  );
}

export default Ventas;
