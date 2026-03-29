import { useState, useMemo, useRef, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  ChevronRight, ChevronLeft, Plus, Trash2,
  Building2, Package, CheckCircle, RefreshCw,
  Truck, Calendar, Hash, FileText, FileUp, Percent,
  UploadCloud, X, Search, Link2,
} from 'lucide-react';
import Stepper from '../../components/Stepper/Stepper';
import Table from '../../components/Table/Table';
import {
  useRecepciones, useCrearRecepcion, useSubirXML,
  useRecepcion, useEscanearItem, useCerrarRecepcion, useResumenVerificacion,
} from '../../queries/inventario.queries';
import { useToast } from '../../components/Toast/Toast';
import { useAuth } from '../../context/AuthContext';
import styles from './Recepciones.module.css';

/* ── Estados del backend ── */
const ESTADO_LABELS = {
  abierta:                      'Abierta',
  finalizada:                   'Finalizada',
  finalizada_con_discrepancia:  'Con discrepancia',
  anulada:                      'Anulada',
};

/* ── Sub-componente Step0: Datos del proveedor ── */
function Step0({ register, errors, styles }) {
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepIntro}>
        <Building2 size={24} className={styles.stepIcon} />
        <div>
          <h3 className={styles.stepTitle}>Datos del proveedor</h3>
          <p className={styles.stepDesc}>Ingresa la información de la factura de compra</p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="proveedor">
            Proveedor <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputIconWrap}>
            <Truck size={15} className={styles.inputIcon} />
            <input
              id="proveedor"
              type="text"
              className={`${styles.formInput} ${errors.proveedor ? styles.inputError : ''}`}
              placeholder="Nombre del proveedor"
              {...register('proveedor', { required: 'El proveedor es obligatorio' })}
            />
          </div>
          {errors.proveedor && <span className={styles.errorMsg}>{errors.proveedor.message}</span>}
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="numero_factura">
            N° de factura <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputIconWrap}>
            <Hash size={15} className={styles.inputIcon} />
            <input
              id="numero_factura"
              type="text"
              className={`${styles.formInput} ${errors.numero_factura ? styles.inputError : ''}`}
              placeholder="Ej: FAC-2024-0001"
              {...register('numero_factura', { required: 'El número de factura es obligatorio' })}
            />
          </div>
          {errors.numero_factura && <span className={styles.errorMsg}>{errors.numero_factura.message}</span>}
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="fecha_recepcion">
            Fecha de recepción <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputIconWrap}>
            <Calendar size={15} className={styles.inputIcon} />
            <input
              id="fecha_recepcion"
              type="date"
              className={`${styles.formInput} ${errors.fecha_recepcion ? styles.inputError : ''}`}
              {...register('fecha_recepcion', { required: 'La fecha es obligatoria' })}
            />
          </div>
          {errors.fecha_recepcion && <span className={styles.errorMsg}>{errors.fecha_recepcion.message}</span>}
        </div>

        <div className={`${styles.formField} ${styles.fullWidth}`}>
          <label className={styles.formLabel} htmlFor="notas">Notas</label>
          <div className={styles.inputIconWrap}>
            <FileText size={15} className={styles.inputIcon} />
            <input
              id="notas"
              type="text"
              className={styles.formInput}
              placeholder="Observaciones opcionales..."
              {...register('notas')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-componente Step1: Productos ── */
function Step1({ fields, append, remove, register, errors, items, totalUnidades, totalCosto, formatCOP, styles }) {
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepIntro}>
        <Package size={24} className={styles.stepIcon} />
        <div>
          <h3 className={styles.stepTitle}>Productos recibidos</h3>
          <p className={styles.stepDesc}>Agrega los productos de la factura con sus cantidades</p>
        </div>
      </div>

      {/* Tabla de items */}
      <div className={styles.itemsSection}>
        {/* Header */}
        <div className={styles.itemsHeader}>
          <span>EAN</span>
          <span>Nombre del producto</span>
          <span>Cantidad</span>
          <span>Precio costo</span>
          <span></span>
        </div>

        {/* Rows */}
        {fields.map((field, idx) => (
          <div key={field.id} className={styles.itemRow}>
            <input
              type="text"
              className={`${styles.itemInput} ${errors.items?.[idx]?.ean ? styles.inputError : ''}`}
              placeholder="EAN"
              {...register(`items.${idx}.ean`, { required: true })}
            />
            <input
              type="text"
              className={`${styles.itemInput} ${errors.items?.[idx]?.nombre ? styles.inputError : ''}`}
              placeholder="Nombre"
              {...register(`items.${idx}.nombre`, { required: true })}
            />
            <input
              type="number"
              min="1"
              className={`${styles.itemInput} ${styles.inputNum} ${errors.items?.[idx]?.cantidad ? styles.inputError : ''}`}
              placeholder="0"
              {...register(`items.${idx}.cantidad`, { required: true, min: 1 })}
            />
            <input
              type="number"
              min="0"
              className={`${styles.itemInput} ${styles.inputNum}`}
              placeholder="0"
              {...register(`items.${idx}.precio_costo`)}
            />
            <button
              type="button"
              className={styles.removeItemBtn}
              onClick={() => remove(idx)}
              disabled={fields.length === 1}
              aria-label="Eliminar producto"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}

        {/* Agregar fila */}
        <button
          type="button"
          className={styles.addItemBtn}
          onClick={() => append({ ean: '', nombre: '', cantidad: '', precio_costo: '' })}
        >
          <Plus size={15} />
          Agregar producto
        </button>
      </div>

      {/* Resumen dinámico */}
      <div className={styles.itemsSummary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Productos</span>
          <span className={styles.summaryVal}>{fields.length}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total unidades</span>
          <span className={styles.summaryVal}>{totalUnidades}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Costo total</span>
          <span className={`${styles.summaryVal} ${styles.summaryGreen}`}>{formatCOP(totalCosto)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-componente Step2: Confirmación ── */
function Step2({ proveedor, nroFactura, items, totalUnidades, totalCosto, formatCOP, styles }) {
  const itemsValidos = items.filter(
    (it) => it.ean && it.nombre && Number(it.cantidad) > 0
  );

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepIntro}>
        <CheckCircle size={24} className={styles.stepIcon} style={{ color: 'var(--accent-secondary)' }} />
        <div>
          <h3 className={styles.stepTitle}>Confirmación</h3>
          <p className={styles.stepDesc}>Revisa los datos antes de registrar la recepción</p>
        </div>
      </div>

      {/* Resumen proveedor */}
      <div className={styles.confirmCard}>
        <p className={styles.confirmSection}>Información del proveedor</p>
        <div className={styles.confirmGrid}>
          <div className={styles.confirmItem}>
            <span className={styles.confirmLabel}>Proveedor</span>
            <span className={styles.confirmVal}>{proveedor || '—'}</span>
          </div>
          <div className={styles.confirmItem}>
            <span className={styles.confirmLabel}>N° Factura</span>
            <span className={styles.confirmVal}>{nroFactura || '—'}</span>
          </div>
        </div>
      </div>

      {/* Lista de productos a ingresar */}
      <div className={styles.confirmCard}>
        <p className={styles.confirmSection}>
          Productos a ingresar ({itemsValidos.length})
        </p>
        <div className={styles.confirmItems}>
          {itemsValidos.map((it, i) => (
            <div key={i} className={styles.confirmItemRow}>
              <div className={styles.confirmItemInfo}>
                <span className={styles.confirmItemNombre}>{it.nombre}</span>
                <span className={styles.confirmItemEan}>{it.ean}</span>
              </div>
              <div className={styles.confirmItemNums}>
                <span className={styles.confirmItemCant}>{it.cantidad} und</span>
                {it.precio_costo && (
                  <span className={styles.confirmItemCosto}>
                    {formatCOP(Number(it.precio_costo) * Number(it.cantidad))}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totales finales */}
      <div className={styles.confirmTotales}>
        <div className={styles.confirmTotalRow}>
          <span>Total de referencias</span>
          <span>{itemsValidos.length}</span>
        </div>
        <div className={styles.confirmTotalRow}>
          <span>Total de unidades</span>
          <span>{totalUnidades}</span>
        </div>
        <div className={`${styles.confirmTotalRow} ${styles.confirmTotalFinal}`}>
          <span>Costo total</span>
          <span>{formatCOP(totalCosto)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-componente: Modal de vinculación EAN ── */
function ModalVincular({ ean, pendientes, onVincular, onCancelar }) {
  const [busqueda, setBusqueda] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    // Autofocus en el buscador al abrir
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return pendientes;
    const q = busqueda.toLowerCase();
    return pendientes.filter((p) =>
      p.nombre_koaj?.toLowerCase().includes(q) ||
      p.referencia_base?.toLowerCase().includes(q) ||
      p.talla?.toLowerCase().includes(q) ||
      p.color?.toLowerCase().includes(q)
    );
  }, [busqueda, pendientes]);

  return (
    <div className={styles.modalOverlay} onClick={onCancelar}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>

        {/* Cabecera */}
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderLeft}>
            <div className={styles.modalIconWrap}>
              <Link2 size={18} />
            </div>
            <div>
              <h3 className={styles.modalTitle}>Vincular código de barras</h3>
              <p className={styles.modalSubtitle}>
                EAN escaneado: <code className={styles.eanCode}>{ean}</code>
              </p>
            </div>
          </div>
          <button className={styles.modalClose} onClick={onCancelar} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Buscador */}
        <div className={styles.modalSearchWrap}>
          <Search size={15} className={styles.modalSearchIcon} />
          <input
            ref={searchRef}
            type="text"
            className={styles.modalSearchInput}
            placeholder="Buscar por nombre, referencia, talla o color..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button className={styles.modalSearchClear} onClick={() => setBusqueda('')}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Contador */}
        <div className={styles.modalCount}>
          {filtrados.length} de {pendientes.length} productos pendientes
        </div>

        {/* Lista */}
        <div className={styles.vincularList}>
          {filtrados.length === 0 ? (
            <div className={styles.vincularEmpty}>
              <Search size={28} />
              <p>Sin resultados para "{busqueda}"</p>
            </div>
          ) : (
            filtrados.map((p) => {
              const yaVinculado = !!p.ean;
              return (
                <button
                  key={p.id}
                  className={`${styles.vincularItem} ${yaVinculado ? styles.vincularItemBloqueado : ''}`}
                  onClick={() => !yaVinculado && onVincular(p.id)}
                  disabled={yaVinculado}
                >
                  <div className={`${styles.vincularBadge} ${yaVinculado ? styles.vincularBadgeBloqueado : ''}`}>
                    {p.talla}
                  </div>
                  <div className={styles.vincularInfo}>
                    <span className={styles.vincularNombre}>{p.nombre_koaj}</span>
                    <span className={styles.vincularDetalle}>
                      {p.referencia_base} &nbsp;·&nbsp; {p.color}
                    </span>
                    {yaVinculado && (
                      <span className={styles.vincularEanAsignado}>
                        EAN: {p.ean}
                      </span>
                    )}
                  </div>
                  <span className={styles.vincularPendCount}>
                    {p.pendientes_count} por verificar
                  </span>
                  {yaVinculado ? (
                    <span className={styles.vincularBloqueadoLabel}>
                      ✓ Ya vinculado
                    </span>
                  ) : (
                    <div className={styles.vincularAction}>
                      Vincular <ChevronRight size={14} />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-componente: Detalle y escaneo de recepción ── */
function DetalleRecepcion({ recepcionId, onVolver }) {
  const toast   = useToast();
  const eanRef  = useRef(null);
  const [ean, setEan]               = useState('');
  const [pendientesVincular, setPendientesVincular] = useState(null); // { ean, lista }

  const [tab, setTab] = useState('escaneo'); // 'escaneo' | 'resumen'

  const { data, isLoading }           = useRecepcion(recepcionId);
  const { data: resumenData,
          refetch: refetchResumen }    = useResumenVerificacion(recepcionId);
  const escanear  = useEscanearItem(recepcionId);
  const cerrar    = useCerrarRecepcion();

  const recepcion = data?.recepcion ?? {};
  const items     = data?.items     ?? [];

  const totalEsperado   = items.length;
  const totalVerificado = items.filter((i) => i.verificado_por_empleado).length;
  const progreso        = totalEsperado > 0 ? Math.round((totalVerificado / totalEsperado) * 100) : 0;

  const esCerrada = ['finalizada', 'finalizada_con_discrepancia', 'anulada'].includes(recepcion.estado);

  const handleScan = (e) => {
    e.preventDefault();
    const valor = ean.trim();
    if (!valor) return;
    escanear.mutate({ ean: valor }, {
      onSuccess: () => {
        toast.success(`✓ ${valor}`);
        setEan('');
        eanRef.current?.focus();
      },
      onError: (err) => {
        const body = err?.response?.data;
        // EAN desconocido → mostrar modal de vinculación
        if (body?.status === 'ean_desconocido') {
          setPendientesVincular({ ean: valor, lista: body.pendientes ?? [] });
          setEan('');
          return;
        }
        toast.error(body?.error ?? 'Error al escanear');
        setEan('');
        eanRef.current?.focus();
      },
    });
  };

  const handleVincular = (force_sku_id) => {
    const { ean: eanPendiente } = pendientesVincular;
    setPendientesVincular(null);
    escanear.mutate({ ean: eanPendiente, force_sku_id }, {
      onSuccess: () => {
        toast.success(`EAN ${eanPendiente} vinculado y verificado`);
        eanRef.current?.focus();
      },
      onError: (err) => toast.error(err?.response?.data?.error ?? 'Error al vincular'),
    });
  };

  const handleCerrar = () => {
    if (!window.confirm('¿Confirmas el cierre de esta recepción? Se actualizará el inventario.')) return;
    cerrar.mutate(recepcionId, {
      onSuccess: (res) => {
        toast.success(res.message ?? 'Recepción cerrada');
        onVolver();
      },
      onError: (err) => toast.error(err?.response?.data?.error ?? 'Error al cerrar'),
    });
  };

  if (isLoading) return <div className={styles.loadingMsg}>Cargando recepción...</div>;

  // Agrupar items por sku para mostrar tabla resumida para mostrar tabla resumida
  const agrupados = items.reduce((acc, item) => {
    const key = item.sku_id;
    if (!acc[key]) {
      acc[key] = {
        sku_id:   item.sku_id,
        nombre:   item.nombre_koaj,
        talla:    item.talla,
        color:    item.color,
        esperado: 0,
        verificado: 0,
      };
    }
    acc[key].esperado += 1;
    if (item.verificado_por_empleado) acc[key].verificado += 1;
    return acc;
  }, {});
  const filas = Object.values(agrupados);

  return (
    <div className={styles.detalleWrap}>
      {pendientesVincular && (
        <ModalVincular
          ean={pendientesVincular.ean}
          pendientes={pendientesVincular.lista}
          onVincular={handleVincular}
          onCancelar={() => { setPendientesVincular(null); eanRef.current?.focus(); }}
        />
      )}
      {/* Header detalle */}
      <div className={styles.detalleHeader}>
        <button className={styles.volverBtn} onClick={onVolver}>
          <ChevronLeft size={16} /> Volver
        </button>
        <div>
          <h2 className={styles.detalleTitle}>
            Factura {recepcion.factura_koaj} — Entrega #{recepcion.numero_entrega}
          </h2>
          <p className={styles.detalleSubtitle}>
            {totalVerificado} de {totalEsperado} unidades verificadas
          </p>
        </div>
        {!esCerrada && (
          <button
            className={styles.btnCerrar}
            onClick={handleCerrar}
            disabled={cerrar.isLoading}
          >
            <CheckCircle size={16} />
            {cerrar.isLoading ? 'Cerrando...' : 'Cerrar recepción'}
          </button>
        )}
      </div>

      {/* Barra de progreso */}
      <div className={styles.progresoWrap}>
        <div className={styles.progresoBar}>
          <div className={styles.progresoFill} style={{ width: `${progreso}%` }} />
        </div>
        <span className={styles.progresoPct}>{progreso}%</span>
      </div>

      {/* Pestañas */}
      <div className={styles.tabsWrap}>
        <button
          className={`${styles.tab} ${tab === 'escaneo' ? styles.tabActive : ''}`}
          onClick={() => setTab('escaneo')}
        >
          <Package size={15} /> Escaneo
        </button>
        <button
          className={`${styles.tab} ${tab === 'resumen' ? styles.tabActive : ''}`}
          onClick={() => { setTab('resumen'); refetchResumen(); }}
        >
          <CheckCircle size={15} /> Resumen de verificación
        </button>
      </div>

      {/* Tab: Escaneo */}
      {tab === 'escaneo' && (
        <>
          {!esCerrada && (
            <form onSubmit={handleScan} className={styles.scanForm}>
              <div className={styles.scanInputWrap}>
                <Package size={18} className={styles.scanIcon} />
                <input
                  ref={eanRef}
                  autoFocus
                  type="text"
                  className={styles.scanInput}
                  placeholder="Escanea o escribe el EAN y presiona Enter..."
                  value={ean}
                  onChange={(e) => setEan(e.target.value)}
                  disabled={escanear.isLoading}
                />
              </div>
              <button type="submit" className={styles.btnScan} disabled={escanear.isLoading || !ean.trim()}>
                Verificar
              </button>
            </form>
          )}
          <div className={styles.tableCard}>
            <table className={styles.detalleTable}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Talla</th>
                  <th>Color</th>
                  <th className={styles.thCenter}>Esperado</th>
                  <th className={styles.thCenter}>Verificado</th>
                  <th className={styles.thCenter}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.sku_id} className={f.verificado === f.esperado ? styles.rowOk : styles.rowPending}>
                    <td>{f.nombre}</td>
                    <td>{f.talla}</td>
                    <td>{f.color}</td>
                    <td className={styles.tdCenter}>{f.esperado}</td>
                    <td className={styles.tdCenter}>{f.verificado}</td>
                    <td className={styles.tdCenter}>
                      {f.verificado === f.esperado
                        ? <span className={styles.badgeOk}>Completo</span>
                        : <span className={styles.badgePending}>Faltan {f.esperado - f.verificado}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tab: Resumen de verificación */}
      {tab === 'resumen' && (
        <div className={styles.tableCard}>
          <table className={styles.detalleTable}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Referencia</th>
                <th>Talla</th>
                <th>Color</th>
                <th className={styles.thCenter}>Esperado</th>
                <th className={styles.thCenter}>Verificado</th>
                <th className={styles.thCenter}>Faltante</th>
              </tr>
            </thead>
            <tbody>
              {(resumenData?.resumen ?? []).map((r, i) => (
                <tr key={i} className={r.faltante === 0 ? styles.rowOk : styles.rowPending}>
                  <td>{r.nombre_koaj}</td>
                  <td><code className={styles.refCode}>{r.referencia_base}</code></td>
                  <td>{r.talla}</td>
                  <td>{r.color}</td>
                  <td className={styles.tdCenter}>{r.total_esperado}</td>
                  <td className={styles.tdCenter}>{r.verificado}</td>
                  <td className={styles.tdCenter}>
                    {r.faltante === 0
                      ? <span className={styles.badgeOk}>✓</span>
                      : <span className={styles.badgePending}>{r.faltante}</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!resumenData?.resumen?.length && (
            <p className={styles.loadingMsg}>Sin datos aún — escanea al menos un ítem.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-componente: Formulario carga XML ── */
function FormXML({ onCancel, tiendaId }) {
  const toast       = useToast();
  const xmlMutation = useSubirXML();
  const fileRef     = useRef(null);
  const [archivo, setArchivo]   = useState(null);
  const [margen, setMargen]     = useState('');
  const [drag, setDrag]         = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.xml')) {
      toast.error('Solo se aceptan archivos .xml');
      return;
    }
    setArchivo(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const onSubmitXML = (e) => {
    e.preventDefault();
    if (!archivo) { toast.warning('Selecciona el archivo XML'); return; }
    if (!margen || Number(margen) <= 0) { toast.warning('Ingresa el margen objetivo'); return; }
    xmlMutation.mutate(
      { tienda_id: tiendaId, margen_objetivo: Number(margen), archivo },
      {
        onSuccess: (data) => {
          toast.success(`Recepción creada — ${data.totalUnidades} unidades cargadas`);
          onCancel();
        },
        onError: (err) => {
          toast.error(err?.response?.data?.detalle ?? 'Error procesando el XML');
        },
      }
    );
  };

  return (
    <div className={styles.formCard}>
      <div className={styles.stepIntro} style={{ marginBottom: '1.5rem' }}>
        <FileUp size={24} className={styles.stepIcon} />
        <div>
          <h3 className={styles.stepTitle}>Cargar factura XML — Koaj</h3>
          <p className={styles.stepDesc}>El sistema leerá el XML y creará los productos, SKUs y precios automáticamente</p>
        </div>
      </div>

      <form onSubmit={onSubmitXML}>
        {/* Drop zone */}
        <div
          className={`${styles.dropZone} ${drag ? styles.dropZoneActive : ''} ${archivo ? styles.dropZoneDone : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xml"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {archivo ? (
            <>
              <CheckCircle size={32} style={{ color: 'var(--accent-secondary)' }} />
              <p className={styles.dropZoneFileName}>{archivo.name}</p>
              <button
                type="button"
                className={styles.removeFileBtn}
                onClick={(e) => { e.stopPropagation(); setArchivo(null); }}
              >
                <X size={14} /> Cambiar archivo
              </button>
            </>
          ) : (
            <>
              <UploadCloud size={32} style={{ color: 'var(--text-secondary)' }} />
              <p className={styles.dropZoneText}>Arrastra el XML aquí o <span>haz clic para seleccionar</span></p>
              <p className={styles.dropZoneHint}>Solo archivos .xml de factura Koaj</p>
            </>
          )}
        </div>

        {/* Margen objetivo */}
        <div className={styles.formField} style={{ maxWidth: 280, marginTop: '1.5rem' }}>
          <label className={styles.formLabel}>
            Margen objetivo <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputIconWrap}>
            <Percent size={15} className={styles.inputIcon} />
            <input
              type="number"
              min="1"
              max="99"
              step="0.1"
              className={styles.formInput}
              placeholder="Ej: 60"
              value={margen}
              onChange={(e) => setMargen(e.target.value)}
            />
          </div>
          <span className={styles.fieldHint}>
            Precio de venta = costo / (1 − margen%)
          </span>
        </div>

        <div className={styles.navBtns} style={{ marginTop: '2rem' }}>
          <button type="button" className={styles.btnBack} onClick={onCancel}>
            <ChevronLeft size={16} /> Cancelar
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="submit"
            className={styles.btnConfirm}
            disabled={xmlMutation.isLoading || !archivo}
          >
            <UploadCloud size={16} />
            {xmlMutation.isLoading ? 'Procesando XML...' : 'Procesar y cargar'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Componente principal ── */
export default function Recepciones() {
  const { user }     = useAuth();
  const toast        = useToast();
  const [paso, setPaso]             = useState(0);
  const [modoForm, setModoForm]     = useState(false);   // false | 'manual' | 'xml'
  const [recepcionId, setRecepcionId] = useState(null);  // UUID de recepción abierta

  const { data, isLoading: loadingLista, refetch } = useRecepciones();
  const recepciones = data?.recepciones ?? [];

  const crearMutation = useCrearRecepcion();

  const form = useForm({
    defaultValues: {
      proveedor:        '',
      numero_factura:   '',
      fecha_recepcion:  new Date().toISOString().split('T')[0],
      notas:            '',
      items: [{ ean: '', nombre: '', cantidad: '', precio_costo: '' }],
    },
  });

  const { register, trigger, handleSubmit, reset, watch, formState: { errors } } = form;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const items        = watch('items');
  const proveedor    = watch('proveedor');
  const nroFactura   = watch('numero_factura');

  const totalUnidades = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0),
    [items]
  );
  const totalCosto = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.precio_costo) || 0), 0),
    [items]
  );

  const formatCOP = (v) =>
    '$ ' + Number(v).toLocaleString('es-CO', { minimumFractionDigits: 0 });

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  const avanzar = async () => {
    let valid = false;
    if (paso === 0) {
      valid = await trigger(['proveedor', 'numero_factura', 'fecha_recepcion']);
    } else if (paso === 1) {
      valid = await trigger('items');
      const tieneItems = items.some(
        (it) => it.ean && it.nombre && Number(it.cantidad) > 0
      );
      if (!tieneItems) {
        toast.warning('Agrega al menos un producto con datos completos');
        return;
      }
    }
    if (valid) setPaso((p) => p + 1);
  };

  const retroceder = () => setPaso((p) => p - 1);

  const onSubmit = handleSubmit((values) => {
    crearMutation.mutate(
      {
        tienda_id:      user?.tienda_id,
        proveedor:      values.proveedor,
        numero_factura: values.numero_factura,
        fecha:          values.fecha_recepcion,
        notas:          values.notas,
        items: values.items
          .filter((it) => it.ean && it.nombre && Number(it.cantidad) > 0)
          .map((it) => ({
            ean:          it.ean,
            nombre:       it.nombre,
            cantidad:     Number(it.cantidad),
            precio_costo: Number(it.precio_costo),
          })),
      },
      {
        onSuccess: () => {
          toast.success('Recepción registrada exitosamente');
          reset();
          setPaso(0);
          setModoForm(false);
        },
        onError: () => toast.error('Error al registrar la recepción'),
      }
    );
  });

  const cancelarForm = () => {
    reset();
    setPaso(0);
    setModoForm(false);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Recepciones</h1>
          <p className={styles.pageSubtitle}>Ingreso de mercancía al inventario</p>
        </div>
        {!modoForm ? (
          <div className={styles.headerBtns}>
            <button className={styles.xmlBtn} onClick={() => setModoForm('xml')}>
              <FileUp size={16} />
              Cargar XML Koaj
            </button>
            <button className={styles.newBtn} onClick={() => setModoForm('manual')}>
              <Plus size={16} />
              Manual
            </button>
          </div>
        ) : (
          <button className={styles.cancelBtn} onClick={cancelarForm}>
            Cancelar
          </button>
        )}
      </div>

      {recepcionId ? (
        <DetalleRecepcion
          recepcionId={recepcionId}
          onVolver={() => setRecepcionId(null)}
        />
      ) : modoForm === 'xml' ? (
        <FormXML onCancel={cancelarForm} tiendaId={user?.tienda_id} />
      ) : modoForm === 'manual' ? (
        /* ── FORMULARIO STEPPER ── */
        <div className={styles.formCard}>
          {/* Stepper indicador visual */}
          <div className={styles.stepperWrap}>
            <Stepper currentStep={paso}>
              <Stepper.Step index={0} label="Proveedor" />
              <Stepper.Step index={1} label="Productos" />
              <Stepper.Step index={2} label="Confirmación" />
            </Stepper>
          </div>

          {/* Contenido del paso */}
          <form onSubmit={onSubmit}>
            <Stepper currentStep={paso}>
              <Stepper.Content>
                {/* Paso 0: Datos del proveedor */}
                <Step0
                  register={register}
                  errors={errors}
                  styles={styles}
                />
                {/* Paso 1: Productos */}
                <Step1
                  fields={fields}
                  append={append}
                  remove={remove}
                  register={register}
                  errors={errors}
                  items={items}
                  totalUnidades={totalUnidades}
                  totalCosto={totalCosto}
                  formatCOP={formatCOP}
                  styles={styles}
                />
                {/* Paso 2: Confirmación */}
                <Step2
                  proveedor={proveedor}
                  nroFactura={nroFactura}
                  items={items}
                  totalUnidades={totalUnidades}
                  totalCosto={totalCosto}
                  formatCOP={formatCOP}
                  styles={styles}
                />
              </Stepper.Content>
            </Stepper>

            {/* Navegación */}
            <div className={styles.navBtns}>
              {paso > 0 && (
                <button type="button" className={styles.btnBack} onClick={retroceder}>
                  <ChevronLeft size={16} /> Anterior
                </button>
              )}
              <div style={{ flex: 1 }} />
              {paso < 2 ? (
                <button type="button" className={styles.btnNext} onClick={avanzar}>
                  Siguiente <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  className={styles.btnConfirm}
                  disabled={crearMutation.isLoading}
                >
                  <CheckCircle size={16} />
                  {crearMutation.isLoading ? 'Registrando...' : 'Confirmar recepción'}
                </button>
              )}
            </div>
          </form>
        </div>
      ) : (
        /* ── LISTA DE RECEPCIONES ── */
        <>
          <div className={styles.tableHeader}>
            <p className={styles.tableTitle}>Recepciones recientes</p>
            <button className={styles.refreshBtn} onClick={refetch} disabled={loadingLista}>
              <RefreshCw size={14} className={loadingLista ? styles.spinning : ''} />
              Actualizar
            </button>
          </div>

          <div className={styles.tableCard}>
            <Table data={recepciones} pageSize={10} onRowClick={(row) => setRecepcionId(row.id)}>
              <Table.Body>
                <Table.Col field="factura_koaj" render={(v) => (
                  <span className={styles.recepcionId}>{v}</span>
                )}>Factura</Table.Col>
                <Table.Col field="numero_entrega" align="center" render={(v) => (
                  <div className={styles.proveedorCell}>
                    <Truck size={14} />
                    <span>Entrega #{v}</span>
                  </div>
                )}>Entrega</Table.Col>
                <Table.Col field="fecha_factura" render={(v) => formatDate(v)}>Fecha factura</Table.Col>
                <Table.Col field="total_unidades" align="center" render={(v, row) => (
                  <span title={`Recibidas: ${row.total_unidades_recibidas}`}>
                    {row.total_unidades_recibidas ?? 0} / {v}
                  </span>
                )}>Unidades</Table.Col>
                <Table.Col field="total_costo" align="right" render={(v) => formatCOP(v)}>Costo total</Table.Col>
                <Table.Col field="estado" render={(v) => (
                  <span className={`${styles.estadoBadge} ${styles[`estado_${v}`]}`}>
                    {ESTADO_LABELS[v] ?? v}
                  </span>
                )}>Estado</Table.Col>
                <Table.Col field="usuario">Registrado por</Table.Col>
              </Table.Body>
              <Table.Empty>No hay recepciones registradas</Table.Empty>
              <Table.Pagination />
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
