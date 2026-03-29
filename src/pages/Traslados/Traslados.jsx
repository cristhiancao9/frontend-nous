import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  RefreshCw, Plus, X, Truck, PackageCheck, Clock, CheckCircle2,
  ArrowRight, Search, Trash2, Package,
} from 'lucide-react';
import {
  useTraslados, useTraslado, useCrearTraslado,
  useDespacharTraslado, useRecibirTraslado,
} from '../../queries/traslados.queries';
import { useBuscarProductoEAN } from '../../queries/inventario.queries';
import { useToast } from '../../components/Toast/Toast';
import { useAuth } from '../../context/AuthContext';
import styles from './Traslados.module.css';

/* ── Helpers ── */
const ESTADO_CONFIG = {
  pendiente:   { label: 'Pendiente',   icon: <Clock size={13} />,        cls: 'estadoPendiente' },
  en_transito: { label: 'En tránsito', icon: <Truck size={13} />,        cls: 'estadoTransito'  },
  recibido:    { label: 'Recibido',    icon: <CheckCircle2 size={13} />,  cls: 'estadoRecibido'  },
};

function EstadoBadge({ estado }) {
  const cfg = ESTADO_CONFIG[estado] ?? { label: estado, icon: null, cls: 'estadoPendiente' };
  return (
    <span className={`${styles.estadoBadge} ${styles[cfg.cls]}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

const formatFecha = (iso) => iso
  ? new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

/* ── BuscadorEAN: input que agrega productos al form ── */
function BuscadorEAN({ tiendaId, onAdd, yaAgregados }) {
  const [ean, setEan] = useState('');
  const { data, isLoading, isError } = useBuscarProductoEAN(
    ean, tiendaId, { enabled: !!ean && !!tiendaId }
  );
  const toast = useToast();

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = e.target.value.trim();
    if (!val) return;
    setEan(val);
  };

  // Cuando llega resultado
  if (data?.producto && ean) {
    const p = data.producto;
    if (yaAgregados.includes(p.sku_id)) {
      toast.warning('Ese producto ya está en la lista');
    } else {
      onAdd(p);
    }
    setEan('');
  }

  if (isError && ean) {
    toast.warning(`EAN no encontrado: ${ean}`);
    setEan('');
  }

  return (
    <div className={styles.eanWrap}>
      <Search size={15} className={styles.eanIcon} />
      <input
        type="text"
        className={`${styles.eanInput} ${isLoading ? styles.eanBuscando : ''}`}
        placeholder={isLoading ? 'Buscando...' : 'Escanear o escribir EAN y Enter'}
        onKeyDown={handleKeyDown}
        onChange={(e) => { if (!e.target.value) setEan(''); }}
      />
    </div>
  );
}

/* ── Modal Crear Traslado ── */
function ModalCrear({ onClose }) {
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm({
    defaultValues: { tienda_origen: '', tienda_destino: '', notas: '', items: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const mutation = useCrearTraslado();
  const toast = useToast();
  const { user } = useAuth();

  const tiendaOrigen = watch('tienda_origen');

  const handleAddProducto = (p) => {
    append({ sku_id: p.sku_id, ean: p.ean, nombre: p.nombre, talla: p.talla, color: p.color, cantidad: 1 });
  };

  const onSubmit = handleSubmit((values) => {
    if (values.items.length === 0) return toast.warning('Agrega al menos un producto');
    mutation.mutate(
      {
        tienda_origen:  Number(values.tienda_origen),
        tienda_destino: Number(values.tienda_destino),
        notas: values.notas || undefined,
        items: values.items.map((i) => ({ ean: i.ean, cantidad: Number(i.cantidad) })),
      },
      {
        onSuccess: () => { toast.success('Traslado creado'); onClose(); },
        onError: (err) => toast.error(err?.response?.data?.error ?? 'Error al crear el traslado'),
      }
    );
  });

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalLg} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderIcon}><Truck size={18} /></div>
          <div>
            <h2 className={styles.modalTitle}>Nuevo traslado</h2>
            <p className={styles.modalSub}>Mueve mercancía entre tiendas</p>
          </div>
          <button className={styles.modalClose} onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={onSubmit}>
          <div className={styles.modalBody}>
            {/* Tiendas */}
            <div className={styles.tiendasRow}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Tienda origen <span className={styles.req}>*</span></label>
                <input
                  type="number" min="1"
                  className={`${styles.formInput} ${errors.tienda_origen ? styles.inputError : ''}`}
                  placeholder="ID tienda origen"
                  {...register('tienda_origen', { required: 'Requerido' })}
                />
                {errors.tienda_origen && <span className={styles.errorMsg}>{errors.tienda_origen.message}</span>}
              </div>
              <ArrowRight size={20} className={styles.arrowIcon} />
              <div className={styles.formField}>
                <label className={styles.formLabel}>Tienda destino <span className={styles.req}>*</span></label>
                <input
                  type="number" min="1"
                  className={`${styles.formInput} ${errors.tienda_destino ? styles.inputError : ''}`}
                  placeholder="ID tienda destino"
                  {...register('tienda_destino', { required: 'Requerido' })}
                />
                {errors.tienda_destino && <span className={styles.errorMsg}>{errors.tienda_destino.message}</span>}
              </div>
            </div>

            {/* Notas */}
            <div className={styles.formField}>
              <label className={styles.formLabel}>Notas (opcional)</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="Ej: Traslado fin de temporada"
                {...register('notas')}
              />
            </div>

            {/* Buscador EAN */}
            <div className={styles.formField}>
              <label className={styles.formLabel}>Agregar productos</label>
              <BuscadorEAN
                tiendaId={tiendaOrigen ? Number(tiendaOrigen) : user?.tienda_id}
                onAdd={handleAddProducto}
                yaAgregados={fields.map((f) => f.sku_id)}
              />
            </div>

            {/* Lista de items */}
            {fields.length > 0 && (
              <div className={styles.itemsTable}>
                <div className={styles.itemsHeader}>
                  <span>Producto</span>
                  <span>Talla</span>
                  <span>Color</span>
                  <span className={styles.centerCol}>Cantidad</span>
                  <span />
                </div>
                {fields.map((field, idx) => (
                  <div key={field.id} className={styles.itemRow}>
                    <div>
                      <p className={styles.itemNombre}>{field.nombre}</p>
                      <p className={styles.itemEan}>{field.ean}</p>
                    </div>
                    <span className={styles.itemAttr}>{field.talla || '—'}</span>
                    <span className={styles.itemAttr}>{field.color || '—'}</span>
                    <div className={styles.centerCol}>
                      <input
                        type="number" min="1"
                        className={styles.cantInput}
                        {...register(`items.${idx}.cantidad`, { required: true, min: 1 })}
                      />
                    </div>
                    <button type="button" className={styles.removeBtn} onClick={() => remove(idx)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className={styles.itemsFooter}>
                  <span>{fields.length} referencia{fields.length !== 1 ? 's' : ''}</span>
                  <span>{fields.reduce((s, f) => s + (Number(f.cantidad) || 0), 0)} unidades</span>
                </div>
              </div>
            )}

            {fields.length === 0 && (
              <div className={styles.emptyItems}>
                <Package size={32} strokeWidth={1.2} />
                <p>Escanea un EAN para agregar productos</p>
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnGhost} onClick={onClose} disabled={mutation.isLoading}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={mutation.isLoading || fields.length === 0}>
              {mutation.isLoading ? 'Creando...' : 'Crear traslado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Modal Detalle ── */
function ModalDetalle({ traslado, onClose }) {
  const { data, isLoading } = useTraslado(traslado.id);
  const despacharMutation = useDespacharTraslado();
  const recibirMutation   = useRecibirTraslado();
  const toast = useToast();

  const detalle = data?.traslado ?? traslado;
  const items   = data?.items ?? [];

  const handleDespachar = () => {
    despacharMutation.mutate(traslado.id, {
      onSuccess: () => toast.success('Mercancía despachada — stock restado del origen'),
      onError: (err) => toast.error(err?.response?.data?.error ?? 'Error al despachar'),
    });
  };

  const handleRecibir = () => {
    recibirMutation.mutate(traslado.id, {
      onSuccess: () => toast.success('Mercancía recibida — stock sumado al destino'),
      onError: (err) => toast.error(err?.response?.data?.error ?? 'Error al recibir'),
    });
  };

  const isBusy = despacharMutation.isLoading || recibirMutation.isLoading;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalLg} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderIcon}><PackageCheck size={18} /></div>
          <div>
            <h2 className={styles.modalTitle}>Traslado #{traslado.id.slice(0, 8)}</h2>
            <p className={styles.modalSub}>
              {detalle.tienda_origen} <ArrowRight size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> {detalle.tienda_destino}
            </p>
          </div>
          <EstadoBadge estado={detalle.estado} />
          <button className={styles.modalClose} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={styles.modalBody}>
          {/* Metadata */}
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Creado por</span>
              <span className={styles.metaVal}>{detalle.creado_por}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Fecha creación</span>
              <span className={styles.metaVal}>{formatFecha(detalle.creado_en)}</span>
            </div>
            {detalle.recibido_en && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Fecha recepción</span>
                <span className={styles.metaVal}>{formatFecha(detalle.recibido_en)}</span>
              </div>
            )}
            {detalle.notas && (
              <div className={styles.metaItem} style={{ gridColumn: '1 / -1' }}>
                <span className={styles.metaLabel}>Notas</span>
                <span className={styles.metaVal}>{detalle.notas}</span>
              </div>
            )}
          </div>

          {/* Items */}
          {isLoading ? (
            <p className={styles.loadingText}>Cargando productos...</p>
          ) : (
            <div className={styles.itemsTable}>
              <div className={styles.itemsHeader}>
                <span>EAN</span>
                <span>Producto</span>
                <span>Talla</span>
                <span>Color</span>
                <span className={styles.centerCol}>Cantidad</span>
              </div>
              {items.map((item) => (
                <div key={item.id} className={styles.itemRowDetail}>
                  <span className={styles.itemEan}>{item.ean}</span>
                  <span className={styles.itemNombre}>{item.nombre}</span>
                  <span className={styles.itemAttr}>{item.talla || '—'}</span>
                  <span className={styles.itemAttr}>{item.color || '—'}</span>
                  <span className={`${styles.centerCol} ${styles.cantBadge}`}>{item.cantidad}</span>
                </div>
              ))}
              <div className={styles.itemsFooter}>
                <span>{items.length} referencia{items.length !== 1 ? 's' : ''}</span>
                <span>{items.reduce((s, i) => s + i.cantidad, 0)} unidades</span>
              </div>
            </div>
          )}
        </div>

        {/* Acciones según estado */}
        <div className={styles.modalFooter}>
          <button className={styles.btnGhost} onClick={onClose}>Cerrar</button>
          {detalle.estado === 'pendiente' && (
            <button className={styles.btnDespachar} onClick={handleDespachar} disabled={isBusy}>
              <Truck size={15} />
              {despacharMutation.isLoading ? 'Despachando...' : 'Despachar'}
            </button>
          )}
          {detalle.estado === 'en_transito' && (
            <button className={styles.btnRecibir} onClick={handleRecibir} disabled={isBusy}>
              <PackageCheck size={15} />
              {recibirMutation.isLoading ? 'Recibiendo...' : 'Confirmar recepción'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Componente principal ── */
export default function Traslados() {
  const [filtroEstado, setFiltroEstado] = useState('');
  const [showCrear, setShowCrear]       = useState(false);
  const [detalle, setDetalle]           = useState(null);
  const { user } = useAuth();

  const { data, isLoading, isError, refetch, isFetching } = useTraslados({
    tienda_id: user?.tienda_id,
    ...(filtroEstado ? { estado: filtroEstado } : {}),
  });

  const traslados = Array.isArray(data) ? data : [];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Traslados</h1>
          <p className={styles.pageSubtitle}>Movimiento de mercancía entre tiendas</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.refreshBtn} onClick={refetch} disabled={isFetching}>
            <RefreshCw size={15} className={isFetching ? styles.spinning : ''} />
            Actualizar
          </button>
          <button className={styles.btnPrimary} onClick={() => setShowCrear(true)}>
            <Plus size={16} /> Nuevo traslado
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filtersBar}>
        {['', 'pendiente', 'en_transito', 'recibido'].map((e) => (
          <button
            key={e}
            className={`${styles.filterBtn} ${filtroEstado === e ? styles.filterActive : ''}`}
            onClick={() => setFiltroEstado(e)}
          >
            {e === '' ? 'Todos' : ESTADO_CONFIG[e]?.label ?? e}
            {e === '' && traslados.length > 0 && (
              <span className={styles.filterCount}>{traslados.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className={styles.tableCard}>
        {isLoading ? (
          <p className={styles.empty}>Cargando traslados...</p>
        ) : isError ? (
          <p className={styles.empty}>Error al cargar los traslados</p>
        ) : traslados.length === 0 ? (
          <p className={styles.empty}>No hay traslados{filtroEstado ? ` en estado "${ESTADO_CONFIG[filtroEstado]?.label}"` : ''}</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Origen</th>
                <th></th>
                <th>Destino</th>
                <th className={styles.centerCol}>Refs.</th>
                <th className={styles.centerCol}>Unidades</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Creado por</th>
              </tr>
            </thead>
            <tbody>
              {traslados.map((t) => (
                <tr key={t.id} className={styles.tableRow} onClick={() => setDetalle(t)}>
                  <td><span className={styles.trasladoId}>#{t.id.slice(0, 8)}</span></td>
                  <td>{t.tienda_origen}</td>
                  <td><ArrowRight size={14} className={styles.arrowCell} /></td>
                  <td>{t.tienda_destino}</td>
                  <td className={styles.centerCol}>{t.total_referencias}</td>
                  <td className={styles.centerCol}>{t.total_unidades}</td>
                  <td><EstadoBadge estado={t.estado} /></td>
                  <td className={styles.fechaCell}>{formatFecha(t.creado_en)}</td>
                  <td className={styles.fechaCell}>{t.creado_por}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCrear && <ModalCrear onClose={() => setShowCrear(false)} />}
      {detalle   && <ModalDetalle traslado={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}
