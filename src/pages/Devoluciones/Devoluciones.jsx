import { useState, useMemo } from 'react';
import {
  Search, RefreshCw, ArrowLeft, RotateCcw, Repeat2,
  Package, ChevronRight, CheckCircle2, X,
  Banknote, CreditCard, ArrowLeftRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVentasByTienda, useVentaDetail } from '../../queries/ventas.queries';
import { useBuscarProductoNombre, useBuscarProductoEAN } from '../../queries/inventario.queries';
import { useCrearDevolucion } from '../../queries/devoluciones.queries';
import { useToast } from '../../components/Toast/Toast';
import styles from './Devoluciones.module.css';

const isEAN = (q) => /^\d{8,}$/.test(q.trim());

const METODOS_PAGO = [
  { value: 'efectivo',      label: 'Efectivo',      icon: <Banknote size={16} /> },
  { value: 'tarjeta',       label: 'Tarjeta',        icon: <CreditCard size={16} /> },
  { value: 'transferencia', label: 'Transferencia',  icon: <ArrowLeftRight size={16} /> },
];

/* ────────────────────────────────────────────────────────── helpers */
const formatCOP = (v) =>
  '$ ' + Number(v).toLocaleString('es-CO', { minimumFractionDigits: 0 });

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/* ────────────────────────────────────────────────────────── ItemRow */
function ItemRow({ item, seleccionado, cantidad, onToggle, onCantidad }) {
  return (
    <div className={`${styles.itemRow} ${seleccionado ? styles.itemRowSel : ''}`}>
      <button
        type="button"
        className={`${styles.itemCheck} ${seleccionado ? styles.itemCheckOn : ''}`}
        onClick={() => onToggle(item.sku_id)}
      >
        {seleccionado ? <CheckCircle2 size={18} /> : <div className={styles.itemCheckEmpty} />}
      </button>

      <div className={styles.itemInfo}>
        <span className={styles.itemNombre}>{item.nombre}</span>
        <span className={styles.itemMeta}>
          {item.talla && `T. ${item.talla}`}
          {item.color && ` · ${item.color}`}
          {item.ean && ` · ${item.ean}`}
        </span>
      </div>

      <div className={styles.itemPrecio}>{formatCOP(item.precio_unitario)}</div>

      <div className={styles.itemCantWrap}>
        {seleccionado ? (
          <input
            type="number"
            min={1}
            max={item.cantidad}
            value={cantidad}
            onChange={(e) => onCantidad(item.sku_id, Number(e.target.value))}
            className={styles.itemCantInput}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={styles.itemCant}>x{item.cantidad}</span>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── BuscarProducto */
function BuscarProducto({ tiendaId, onSelect }) {
  const [query, setQuery] = useState('');
  const porEAN    = isEAN(query);
  const porNombre = !porEAN && query.length >= 2;

  const { data: dataNombre, isFetching: fetchingNombre } = useBuscarProductoNombre(
    query, tiendaId, { enabled: porNombre }
  );
  const { data: dataEAN, isFetching: fetchingEAN } = useBuscarProductoEAN(
    query, tiendaId, { enabled: porEAN }
  );

  const isFetching = fetchingNombre || fetchingEAN;

  const lista = useMemo(() => {
    if (porEAN) {
      const prod = dataEAN?.producto;
      return prod ? [prod] : [];
    }
    const arr = dataNombre?.productos ?? dataNombre ?? [];
    return Array.isArray(arr) ? arr : [];
  }, [porEAN, dataEAN, dataNombre]);

  return (
    <div className={styles.buscarProd}>
      <div className={styles.buscarInputWrap}>
        <Search size={15} className={styles.buscarIcon} />
        <input
          type="text"
          className={styles.buscarInput}
          placeholder="Buscar producto de reemplazo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {isFetching && <RefreshCw size={14} className={styles.buscarSpinner} />}
      </div>

      {lista.length > 0 && (
        <div className={styles.buscarDropdown}>
          {lista.slice(0, 8).map((p) => (
            <button
              key={p.sku_id ?? p.id}
              type="button"
              className={styles.buscarOption}
              onClick={() => {
                onSelect(p);
                setQuery('');
              }}
            >
              <Package size={14} />
              <span className={styles.buscarOptionNombre}>{p.nombre ?? p.nombre_koaj}</span>
              <span className={styles.buscarOptionMeta}>
                {p.talla && `T.${p.talla}`} {p.color && p.color}
              </span>
              <span className={styles.buscarOptionPrecio}>{formatCOP(p.precio_venta)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── Devoluciones */
export default function Devoluciones() {
  const { user } = useAuth();
  const toast = useToast();

  // Paso 1 — buscar venta
  const [busqueda, setBusqueda] = useState('');
  const [ventaSelId, setVentaSelId] = useState(null);

  // Paso 2 — form
  const [tipo, setTipo] = useState('devolucion');
  const [selItems, setSelItems] = useState({});      // { sku_id: cantidad }
  const [itemsCambio, setItemsCambio] = useState([]); // [{ sku_id, cantidad, nombre, precio }]
  const [motivo, setMotivo] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');

  // Resultado
  const [resultado, setResultado] = useState(null);  // { devolucion_id, diferencia }

  const mutation = useCrearDevolucion();

  /* ── Ventas recientes (solo completadas) */
  const { data: ventasData, isFetching: cargandoLista } = useVentasByTienda(
    user?.tienda_id,
    { page: 1, limit: 100 }
  );

  const ventas = useMemo(() => {
    const lista = ventasData?.ventas ?? ventasData ?? [];
    return lista.filter((v) => v.estado === 'completada' && !v.tiene_devolucion);
  }, [ventasData]);

  const ventasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return ventas;
    const q = busqueda.toLowerCase();
    return ventas.filter((v) =>
      (v.numero_factura ?? '').toLowerCase().includes(q) ||
      (v.id ?? '').toLowerCase().includes(q)
    );
  }, [ventas, busqueda]);

  /* ── Detalle venta seleccionada */
  const { data: ventaDetalle, isLoading: cargandoDetalle } = useVentaDetail(ventaSelId);
  const items = ventaDetalle?.items ?? [];

  /* ── Selección de items a devolver */
  const toggleItem = (sku_id) => {
    setSelItems((prev) => {
      if (prev[sku_id]) {
        const next = { ...prev };
        delete next[sku_id];
        return next;
      }
      const item = items.find((i) => i.sku_id === sku_id);
      return { ...prev, [sku_id]: item?.cantidad ?? 1 };
    });
  };

  const setCantItem = (sku_id, cant) => {
    const item = items.find((i) => i.sku_id === sku_id);
    const max = item?.cantidad ?? cant;
    setSelItems((prev) => ({ ...prev, [sku_id]: Math.min(Math.max(1, cant), max) }));
  };

  /* ── Items de reemplazo (solo para cambio) */
  const addItemCambio = (prod) => {
    setItemsCambio((prev) => {
      const existe = prev.find((i) => i.sku_id === (prod.sku_id ?? prod.id));
      if (existe) return prev;
      const label = [prod.nombre ?? prod.nombre_koaj, prod.talla && `T.${prod.talla}`, prod.color].filter(Boolean).join(' · ');
    return [...prev, { sku_id: prod.sku_id ?? prod.id, cantidad: 1, nombre: label, precio: prod.precio_venta }];
    });
  };

  const removeCambioItem = (sku_id) =>
    setItemsCambio((prev) => prev.filter((i) => i.sku_id !== sku_id));

  const setCantCambio = (sku_id, cant) =>
    setItemsCambio((prev) =>
      prev.map((i) => i.sku_id === sku_id ? { ...i, cantidad: Math.max(1, cant) } : i)
    );

  /* ── Totales */
  const totalDevolucion = Object.entries(selItems).reduce((sum, [sku_id, cant]) => {
    const item = items.find((i) => i.sku_id === sku_id);
    return sum + (item?.precio_unitario ?? 0) * cant;
  }, 0);

  const totalCambio = itemsCambio.reduce((sum, i) => sum + (i.precio ?? 0) * i.cantidad, 0);
  // diferencia > 0 → reemplazo más barato (bloqueado, cliente debe agregar más)
  // diferencia = 0 → cambio exacto
  // diferencia < 0 → reemplazo más caro (cliente paga el adicional)
  const diferencia = totalDevolucion - totalCambio;
  const faltaCubrir = tipo === 'cambio' && diferencia > 0;
  const pagoAdicional = tipo === 'cambio' && diferencia < 0;
  const montoAdicional = Math.abs(diferencia);
  const efectivoRecibido = Number(montoRecibido) || 0;
  const cambioEfectivo = efectivoRecibido - montoAdicional;
  const efectivoInsuficiente = pagoAdicional && metodoPago === 'efectivo' && efectivoRecibido > 0 && cambioEfectivo < 0;

  /* ── Reset */
  const reset = () => {
    setVentaSelId(null);
    setSelItems({});
    setItemsCambio([]);
    setMotivo('');
    setTipo('devolucion');
    setMetodoPago('efectivo');
    setMontoRecibido('');
    setResultado(null);
  };

  /* ── Submit */
  const handleSubmit = () => {
    const itemsEntrada = Object.entries(selItems).map(([sku_id, cantidad]) => ({
      sku_id,
      cantidad,
    }));

    if (itemsEntrada.length === 0) {
      toast.error('Selecciona al menos un producto a devolver');
      return;
    }
    if (tipo === 'cambio' && itemsCambio.length === 0) {
      toast.error('Agrega al menos un producto de reemplazo');
      return;
    }
    if (!motivo.trim()) {
      toast.error('El motivo es obligatorio');
      return;
    }

    const payload = {
      venta_id: ventaSelId,
      tipo,
      motivo,
      items_entrada: itemsEntrada,
      ...(tipo === 'cambio' && { items_salida: itemsCambio.map(({ sku_id, cantidad }) => ({ sku_id, cantidad })) }),
      ...(pagoAdicional && { metodo_pago_adicional: metodoPago }),
    };

    mutation.mutate(payload, {
      onSuccess: (data) => {
        setResultado(data);
        toast.success(tipo === 'cambio' ? 'Cambio registrado' : 'Devolución registrada');
      },
      onError: (err) => {
        const msg = err?.response?.data?.error ?? 'Error al procesar';
        toast.error(msg);
      },
    });
  };

  /* ──────────────────────────────────────────────── RENDER RESULTADO */
  if (resultado) {
    return (
      <div className={styles.page}>
        <div className={styles.resultadoCard}>
          <CheckCircle2 size={48} className={styles.resultadoIcon} />
          <h2 className={styles.resultadoTitle}>
            {tipo === 'cambio' ? 'Cambio registrado' : 'Devolución registrada'}
          </h2>
          <p className={styles.resultadoId}>ID: {resultado.devolucion_id}</p>

          {tipo === 'devolucion' && diferencia > 0 && (
            <div className={`${styles.resultadoDif} ${styles.difPos}`}>
              Reembolsar al cliente: {formatCOP(diferencia)}
            </div>
          )}
          {tipo === 'cambio' && diferencia < 0 && (
            <div className={`${styles.resultadoDif} ${styles.difCobro}`}>
              Cobrado {formatCOP(montoAdicional)} vía {metodoPago}
            </div>
          )}
          {tipo === 'cambio' && diferencia < 0 && metodoPago === 'efectivo' && cambioEfectivo > 0 && (
            <div className={`${styles.resultadoDif} ${styles.difPos}`}>
              Cambio entregado al cliente: {formatCOP(cambioEfectivo)}
            </div>
          )}
          {tipo === 'cambio' && diferencia === 0 && (
            <div className={`${styles.resultadoDif} ${styles.difPos}`}>
              Cambio exacto — sin diferencia de precio
            </div>
          )}

          <button className={styles.btnPrimary} onClick={reset}>
            Nueva devolución
          </button>
        </div>
      </div>
    );
  }

  /* ──────────────────────────────────────────────── RENDER PASO 2 */
  if (ventaSelId) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Devoluciones y Cambios</h1>
            <p className={styles.pageSubtitle}>
              {ventaDetalle?.venta?.numero_factura ?? ventaSelId}
              {ventaDetalle?.venta?.created_at && ` — ${formatDate(ventaDetalle.venta.created_at)}`}
            </p>
          </div>
          <button className={styles.backBtn} onClick={reset}>
            <ArrowLeft size={16} /> Volver
          </button>
        </div>

        {cargandoDetalle ? (
          <p className={styles.loadingMsg}>Cargando detalle...</p>
        ) : (
          <div className={styles.paso2Grid}>
            {/* ── Columna izquierda: items venta */}
            <div className={styles.colItems}>
              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>Productos de la venta</h3>
                <p className={styles.sectionSub}>Selecciona los que el cliente devuelve</p>
                <div className={styles.itemsList}>
                  {items.map((item) => (
                    <ItemRow
                      key={item.sku_id}
                      item={item}
                      seleccionado={!!selItems[item.sku_id]}
                      cantidad={selItems[item.sku_id] ?? item.cantidad}
                      onToggle={toggleItem}
                      onCantidad={setCantItem}
                    />
                  ))}
                </div>
              </div>

              {/* Items de cambio */}
              {tipo === 'cambio' && (
                <div className={styles.sectionCard}>
                  <h3 className={styles.sectionTitle}>Producto(s) de reemplazo</h3>
                  <p className={styles.sectionSub}>Lo que el cliente se lleva a cambio</p>

                  <BuscarProducto tiendaId={user?.tienda_id} onSelect={addItemCambio} />

                  {itemsCambio.length > 0 && (
                    <div className={styles.cambioList}>
                      {itemsCambio.map((ci) => (
                        <div key={ci.sku_id} className={styles.cambioItem}>
                          <span className={styles.cambioNombre}>{ci.nombre}</span>
                          <input
                            type="number"
                            min={1}
                            value={ci.cantidad}
                            onChange={(e) => setCantCambio(ci.sku_id, Number(e.target.value))}
                            className={styles.itemCantInput}
                          />
                          <span className={styles.cambioPrecio}>{formatCOP(ci.precio * ci.cantidad)}</span>
                          <button
                            type="button"
                            className={styles.cambioRemove}
                            onClick={() => removeCambioItem(ci.sku_id)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Columna derecha: tipo + resumen + submit */}
            <div className={styles.colForm}>
              {/* Tipo */}
              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>Tipo de operación</h3>
                <div className={styles.tipoGrid}>
                  <button
                    type="button"
                    className={`${styles.tipoBtn} ${tipo === 'devolucion' ? styles.tipoBtnActive : ''}`}
                    onClick={() => setTipo('devolucion')}
                  >
                    <RotateCcw size={18} />
                    <span>Devolución</span>
                    <small>Reembolso al cliente</small>
                  </button>
                  <button
                    type="button"
                    className={`${styles.tipoBtn} ${tipo === 'cambio' ? styles.tipoBtnActive : ''}`}
                    onClick={() => setTipo('cambio')}
                  >
                    <Repeat2 size={18} />
                    <span>Cambio</span>
                    <small>Por otro producto</small>
                  </button>
                </div>
              </div>

              {/* Motivo */}
              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>Motivo</h3>
                <textarea
                  className={styles.motivoInput}
                  placeholder="Ej: Talla incorrecta, producto defectuoso..."
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>

              {/* Resumen */}
              <div className={styles.resumenCard}>
                <div className={styles.resumenRow}>
                  <span>Items seleccionados</span>
                  <strong>{Object.keys(selItems).length}</strong>
                </div>
                <div className={styles.resumenRow}>
                  <span>Total devolución</span>
                  <strong className={styles.resumenPos}>{formatCOP(totalDevolucion)}</strong>
                </div>
                {tipo === 'cambio' && itemsCambio.length > 0 && (
                  <>
                    <div className={styles.resumenRow}>
                      <span>Total reemplazo</span>
                      <strong>{formatCOP(totalCambio)}</strong>
                    </div>
                    <div className={`${styles.resumenRow} ${styles.resumenDif}`}>
                      {faltaCubrir ? (
                        <>
                          <span>Faltan por cubrir</span>
                          <strong className={styles.resumenNeg}>{formatCOP(diferencia)}</strong>
                        </>
                      ) : pagoAdicional ? (
                        <>
                          <span>Cliente paga adicional</span>
                          <strong className={styles.resumenAdicional}>{formatCOP(Math.abs(diferencia))}</strong>
                        </>
                      ) : (
                        <>
                          <span>Diferencia</span>
                          <strong className={styles.resumenPos}>Cambio exacto ✓</strong>
                        </>
                      )}
                    </div>
                    {faltaCubrir && (
                      <p className={styles.resumenAviso}>
                        El cliente debe elegir más productos por al menos {formatCOP(diferencia)} para completar el cambio.
                      </p>
                    )}
                    {pagoAdicional && (
                      <div className={styles.metodoPagoWrap}>
                        <p className={styles.metodoPagoLabel}>Medio de pago del adicional</p>
                        <div className={styles.metodoPagoGrid}>
                          {METODOS_PAGO.map(({ value, label, icon }) => (
                            <button
                              key={value}
                              type="button"
                              className={`${styles.metodoPagoBtn} ${metodoPago === value ? styles.metodoPagoBtnActive : ''}`}
                              onClick={() => { setMetodoPago(value); setMontoRecibido(''); }}
                            >
                              {icon}
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>

                        {metodoPago === 'efectivo' && (
                          <div className={styles.efectivoWrap}>
                            <label className={styles.efectivoLabel}>
                              Efectivo recibido
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={100}
                              className={`${styles.efectivoInput} ${efectivoInsuficiente ? styles.efectivoInputError : ''}`}
                              placeholder={`Mín. ${formatCOP(montoAdicional)}`}
                              value={montoRecibido}
                              onChange={(e) => setMontoRecibido(e.target.value)}
                            />
                            {efectivoRecibido > 0 && (
                              <div className={`${styles.cambioRow} ${efectivoInsuficiente ? styles.cambioInsuf : styles.cambioOk}`}>
                                {efectivoInsuficiente
                                  ? `Faltan ${formatCOP(Math.abs(cambioEfectivo))}`
                                  : `Cambio a devolver: ${formatCOP(cambioEfectivo)}`}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <button
                  type="button"
                  className={styles.btnSubmit}
                  onClick={handleSubmit}
                  disabled={mutation.isLoading || faltaCubrir || efectivoInsuficiente}
                >
                  {mutation.isLoading ? 'Procesando...' : (
                    tipo === 'cambio' ? 'Confirmar cambio' : 'Confirmar devolución'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ──────────────────────────────────────────────── RENDER PASO 1 */
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Devoluciones y Cambios</h1>
          <p className={styles.pageSubtitle}>Busca la venta original para iniciar</p>
        </div>
      </div>

      {/* Buscador */}
      <div className={styles.searchCard}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por número de factura (POS-0001, FE-0001...)"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            autoFocus
          />
          {cargandoLista && <RefreshCw size={14} className={styles.searchSpinner} />}
        </div>
      </div>

      {/* Lista ventas */}
      {ventasFiltradas.length === 0 && !cargandoLista ? (
        <div className={styles.emptyMsg}>
          <Package size={40} className={styles.emptyIcon} />
          <p>No se encontraron ventas completadas</p>
        </div>
      ) : (
        <div className={styles.ventasList}>
          {ventasFiltradas.map((v) => (
            <button
              key={v.id}
              type="button"
              className={styles.ventaRow}
              onClick={() => setVentaSelId(v.id)}
            >
              <div className={styles.ventaNum}>{v.numero_factura ?? v.id.slice(0, 8)}</div>
              <div className={styles.ventaInfo}>
                <span className={styles.ventaFecha}>{formatDate(v.created_at)}</span>
                <span className={styles.ventaTotal}>{formatCOP(v.total)}</span>
              </div>
              <div className={styles.ventaMetodo}>{v.metodo_pago ?? '—'}</div>
              <ChevronRight size={16} className={styles.ventaChevron} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
