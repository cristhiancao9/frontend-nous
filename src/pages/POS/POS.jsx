import { useRef, useEffect, useState } from 'react';
import {
  ShoppingCart, Trash2, Plus, Minus, Search, X,
  CreditCard, Banknote, ArrowLeftRight, Layers,
  ChevronDown, ChevronUp, FileText, Zap, User,
} from 'lucide-react';
import { usePOSForm } from '../../hooks/usePOSForm';
import { useDebounce } from '../../hooks/useDebounce';
import Drawer from '../../components/Drawer/Drawer';
import Badge from '../../components/Badge/Badge';
import { useClienteFactus } from '../../queries/factus.queries';
import { useVentasByTienda } from '../../queries/ventas.queries';
import { useBuscarProductoEAN } from '../../queries/inventario.queries';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast/Toast';
import styles from './POS.module.css';

export default function POS() {
  const { user }  = useAuth();
  const toast     = useToast();
  const eanRef    = useRef(null);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [opcionesRef,   setOpcionesRef]   = useState(null); // array de SKUs cuando hay varias tallas

  const {
    form, fields, remove, update,
    items, subtotal, iva, total, cambio,
    forma_pago, tipo, agregarItem,
    onCobrar, isLoading,
    eanQuery, setEanQuery,
  } = usePOSForm();

  const { register, setValue, watch } = form;

  // Búsqueda EAN real
  const { data: busquedaData, isLoading: buscando, isError: eanError } =
    useBuscarProductoEAN(eanQuery, user?.tienda_id, { enabled: !!eanQuery });

  // Cuando llega el resultado del EAN / referencia → agregar al ticket o mostrar picker
  useEffect(() => {
    if (!busquedaData) return;
    if (busquedaData.producto) {
      agregarItem(busquedaData.producto);
    } else if (busquedaData.productos?.length > 0) {
      setOpcionesRef(busquedaData.productos);
    }
  }, [busquedaData]);

  // Mostrar error si EAN/referencia no encontrado
  useEffect(() => {
    if (eanError && eanQuery) {
      toast.warning(`Producto no encontrado: ${eanQuery}`);
      setEanQuery('');
      setValue('ean_busqueda', '');
      setOpcionesRef(null);
    }
  }, [eanError]);

  // Autofocus EAN
  useEffect(() => { eanRef.current?.focus(); }, [fields.length]);

  const handleEanKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const ean = e.target.value.trim();
    if (!ean) return;
    setEanQuery(ean);
  };

  // Cliente FE — con debounce para no disparar una request por cada tecla
  const clienteNumero    = watch('cliente_numero');
  const clienteTipoDoc   = watch('cliente_tipo_doc');
  const clienteNumeroDeb = useDebounce(clienteNumero, 800);
  const [nombreManual, setNombreManual] = useState('');

  const { data: clienteDian, isLoading: clienteLoading, isError: clienteNoEncontrado } = useClienteFactus(
    { tipo_doc: clienteTipoDoc, numero: clienteNumeroDeb }
  );

  // Mapa local para construir cliente_factus en entrada manual
  const DOC_ID_MAP = { CC: 3, NIT: 6, CE: 5, PP: 4, TI: 7, RC: 11 };

  const clienteConfirmable = clienteDian || (clienteNoEncontrado && nombreManual.trim().length >= 3);
  const clienteLabel = clienteDian
    ? (clienteDian.data?.names ?? clienteDian.names ?? clienteDian.razon_social ?? clienteDian.nombre ?? 'Cliente encontrado')
    : null;

  // Historial últimas ventas
  const { data: historialData } = useVentasByTienda(user?.tienda_id, { limit: 5 });
  const historial = historialData?.ventas ?? [];

  const formatCOP = (v) =>
    '$ ' + Number(v).toLocaleString('es-CO', { minimumFractionDigits: 0 });

  const handleValorRecibido = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setValue('valor_recibido', raw ? Number(raw).toLocaleString('es-CO') : '');
  };

  return (
    <div className={styles.cockpit}>
      {/* ── PANEL IZQUIERDO ── */}
      <div className={styles.ticketPanel}>
        <div className={styles.modeBar}>
          <div className={styles.modeSegment}>
            <button type="button"
              className={`${styles.modeBtn} ${tipo === 'pos' ? styles.modeActive : ''}`}
              onClick={() => setValue('tipo', 'pos')}>
              <Zap size={15} /> POS Normal
            </button>
            <button type="button"
              className={`${styles.modeBtn} ${tipo === 'fe' ? styles.modeActive : ''}`}
              onClick={() => { setValue('tipo', 'fe'); setDrawerOpen(true); }}>
              <FileText size={15} /> Factura Electrónica
            </button>
          </div>
          <span className={styles.modeIndicator}>
            {tipo === 'fe' ? 'Factura Electrónica DIAN' : 'Documento POS'}
          </span>
        </div>

        <div className={styles.itemsList}>
          {fields.length === 0 ? (
            <div className={styles.emptyTicket}>
              <ShoppingCart size={40} strokeWidth={1.2} />
              <p>Escanea o busca un producto para comenzar</p>
            </div>
          ) : (
            fields.map((field, idx) => (
              <div key={field.id} className={styles.ticketItem}>
                <div className={styles.itemInfo}>
                  <p className={styles.itemNombre}>{field.nombre}</p>
                  <p className={styles.itemEan}>{field.ean}</p>
                </div>
                <div className={styles.itemControls}>
                  <button type="button" className={styles.qtyBtn}
                    onClick={() => {
                      const cant = Number(field.cantidad) - 1;
                      if (cant <= 0) remove(idx);
                      else update(idx, { ...field, cantidad: cant });
                    }}>
                    <Minus size={13} />
                  </button>
                  <span className={styles.qty}>{field.cantidad}</span>
                  <button type="button" className={styles.qtyBtn}
                    onClick={() => update(idx, { ...field, cantidad: Number(field.cantidad) + 1 })}>
                    <Plus size={13} />
                  </button>
                </div>
                <div className={styles.itemPrecio}>
                  <p className={styles.precioUnit}>{formatCOP(field.precio)}</p>
                  <p className={styles.precioTotal}>{formatCOP(field.precio * (field.cantidad || 1))}</p>
                </div>
                <button type="button" className={styles.removeBtn}
                  onClick={() => remove(idx)} aria-label="Eliminar">
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        {fields.length > 0 && (
          <div className={styles.totals}>
            <div className={styles.totalRow}><span>Subtotal</span><span>{formatCOP(subtotal)}</span></div>
            <div className={styles.totalRow}><span>IVA (19%)</span><span>{formatCOP(iva)}</span></div>
            <div className={`${styles.totalRow} ${styles.totalFinal}`}>
              <span>TOTAL</span><span>{formatCOP(total)}</span>
            </div>
            {forma_pago === 'efectivo' && cambio > 0 && (
              <div className={`${styles.totalRow} ${styles.cambio}`}>
                <span>Cambio</span><span>{formatCOP(cambio)}</span>
              </div>
            )}
          </div>
        )}

        <div className={styles.historialSection}>
          <button type="button" className={styles.historialToggle}
            onClick={() => setHistorialOpen((v) => !v)}>
            <span>Últimas ventas</span>
            {historialOpen ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
          {historialOpen && (
            <div className={styles.historialList}>
              {historial.length === 0 ? (
                <p className={styles.historialEmpty}>Sin ventas recientes</p>
              ) : historial.map((v) => (
                <div key={v.id} className={styles.historialItem}>
                  <span className={styles.historialId}>{v.id}</span>
                  <span className={styles.historialTotal}>{formatCOP(v.total)}</span>
                  <Badge dian={v.estado_fe ?? 'emitida'} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── PANEL DERECHO ── */}
      <form className={styles.cobroPanel} onSubmit={onCobrar}>
        <div className={styles.eanSection}>
          <label className={styles.fieldLabel}>Código EAN / Nombre</label>
          <div className={styles.eanInputWrap}>
            <Search size={16} className={styles.eanIcon} />
            <input
              ref={eanRef}
              type="text"
              className={`${styles.eanInput} ${buscando ? styles.eanBuscando : ''}`}
              placeholder={buscando ? 'Buscando producto...' : 'Escanear o escribir EAN...'}
              onKeyDown={handleEanKeyDown}
              {...register('ean_busqueda')}
              autoComplete="off"
            />
          </div>
          <p className={styles.eanHint}>
            {buscando ? 'Consultando inventario...' : 'Presiona Enter para agregar'}
          </p>
        </div>

        {/* Picker de talla cuando se busca por referencia */}
        {opcionesRef && (
          <div className={styles.tallaPickerWrap}>
            <div className={styles.tallaPickerHeader}>
              <span>
                <strong>{opcionesRef[0]?.nombre}</strong>
                <em className={styles.tallaPickerRef}> · {opcionesRef[0]?.referencia_base}</em>
              </span>
              <button type="button" className={styles.tallaPickerClose}
                onClick={() => { setOpcionesRef(null); setEanQuery(''); setValue('ean_busqueda', ''); }}>
                <X size={14} />
              </button>
            </div>
            <div className={styles.tallaGrid}>
              {opcionesRef.map((sku) => (
                <button
                  key={sku.sku_id}
                  type="button"
                  disabled={sku.stock_actual <= 0}
                  className={`${styles.tallaBtn} ${sku.stock_actual <= 0 ? styles.tallaSinStock : ''}`}
                  onClick={() => { agregarItem(sku); setOpcionesRef(null); }}
                >
                  <span className={styles.tallaCodigo}>{sku.talla}</span>
                  <span className={styles.tallaStock}>
                    {sku.stock_actual > 0 ? `${sku.stock_actual} uds` : 'Sin stock'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.paySection}>
          <label className={styles.fieldLabel}>Forma de pago</label>
          <div className={styles.payGrid}>
            {[
              { value: 'efectivo',      label: 'Efectivo',      icon: <Banknote size={22} /> },
              { value: 'tarjeta',       label: 'Tarjeta',       icon: <CreditCard size={22} /> },
              { value: 'transferencia', label: 'Transferencia', icon: <ArrowLeftRight size={22} /> },
              { value: 'mixto',         label: 'Mixto',         icon: <Layers size={22} /> },
            ].map(({ value, label, icon }) => (
              <button key={value} type="button"
                className={`${styles.payBtn} ${forma_pago === value ? styles.payActive : ''}`}
                onClick={() => setValue('forma_pago', value)}>
                {icon}<span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {forma_pago === 'efectivo' && (
          <div className={styles.valorSection}>
            <label className={styles.fieldLabel} htmlFor="valor_recibido">Valor recibido</label>
            <div className={styles.valorInputWrap}>
              <span className={styles.valorPrefix}>$</span>
              <input id="valor_recibido" type="text" className={styles.valorInput}
                placeholder="0" inputMode="numeric"
                {...register('valor_recibido')} onChange={handleValorRecibido} />
            </div>
            {cambio > 0 && (
              <p className={styles.cambioPreview}>Cambio: <strong>{formatCOP(cambio)}</strong></p>
            )}
          </div>
        )}

        {tipo === 'fe' && (
          <button type="button" className={styles.clienteBtn} onClick={() => setDrawerOpen(true)}>
            <User size={16} />
            {watch('cliente_factus')
              ? (watch('cliente_factus').names ?? 'Cliente confirmado')
              : 'Seleccionar cliente'}
          </button>
        )}

        <div style={{ flex: 1 }} />

        <div className={styles.cobrarSection}>
          <div className={styles.cobrarTotal}>
            <span>Total a cobrar</span>
            <span className={styles.cobrarMonto}>{formatCOP(total)}</span>
          </div>
          <button type="submit" className={styles.cobrarBtn}
            disabled={isLoading || fields.length === 0}>
            {isLoading ? 'Procesando...' : `Cobrar ${formatCOP(total)}`}
          </button>
          <button type="button" className={styles.cancelarBtn} onClick={() => form.reset()}>
            Cancelar venta
          </button>
        </div>
      </form>

      {/* ── DRAWER CLIENTE FE ── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} side="right" width={400}>
        <Drawer.Panel>
          <Drawer.Header>Datos del cliente</Drawer.Header>
          <Drawer.Body>
            {/* Atajo: Consumidor Final */}
            <button
              type="button"
              className={styles.consumidorFinalBtn}
              onClick={() => {
                const cf = {
                  identification:            '222222222222',
                  names:                     'Consumidor Final',
                  company:                   '',
                  trade_name:                '',
                  address:                   'No informado',
                  email:                     '',
                  phone:                     '',
                  dv:                        '',
                  legal_organization_id:     2,
                  tribute_id:                21,
                  identification_document_id: 3,
                  municipality_id:           980,
                };
                setValue('cliente_factus', cf);
                setDrawerOpen(false);
              }}
            >
              <span className={styles.consumidorFinalLabel}>Consumidor Final</span>
              <span className={styles.consumidorFinalSub}>NIT 222222222222 · Sin identificar</span>
            </button>

            <div className={styles.drawerDivider}>
              <span>o buscar por documento</span>
            </div>

            <div className={styles.drawerField}>
              <label className={styles.fieldLabel}>Tipo de documento</label>
              <select className={styles.drawerSelect} {...register('cliente_tipo_doc')}>
                <option value="CC">Cédula de ciudadanía</option>
                <option value="NIT">NIT</option>
                <option value="CE">Cédula extranjería</option>
                <option value="PP">Pasaporte</option>
                <option value="TI">Tarjeta de identidad</option>
              </select>
            </div>
            <div className={styles.drawerField}>
              <label className={styles.fieldLabel}>Número de documento</label>
              <input type="text" className={styles.drawerInput}
                placeholder="Ej: 1030652074" inputMode="numeric"
                {...register('cliente_numero')} />
              <p className={styles.eanHint}>
                {clienteLoading ? 'Consultando DIAN...' : 'Se buscará automáticamente en la DIAN'}
              </p>
            </div>

            {/* Encontrado en DIAN */}
            {clienteDian && !clienteLoading && (
              <div className={styles.clienteCard}>
                <p className={styles.clienteCardTag}>Encontrado en DIAN</p>
                <p className={styles.clienteNombre}>{clienteLabel}</p>
                <p className={styles.clienteDoc}>{clienteTipoDoc}: {clienteNumeroDeb}</p>
                {(clienteDian.data?.email ?? clienteDian.email) && (
                  <p className={styles.clienteEmail}>{clienteDian.data?.email ?? clienteDian.email}</p>
                )}
              </div>
            )}

            {/* No encontrado en DIAN — entrada manual */}
            {clienteNoEncontrado && clienteNumeroDeb && !clienteLoading && (
              <div className={styles.clienteManual}>
                <p className={styles.clienteManualMsg}>
                  No encontrado en DIAN. Ingresa el nombre manualmente.
                </p>
                <div className={styles.drawerField}>
                  <label className={styles.fieldLabel}>Nombre completo</label>
                  <input
                    type="text"
                    className={styles.drawerInput}
                    placeholder="Ej: Juan Pérez"
                    value={nombreManual}
                    onChange={(e) => setNombreManual(e.target.value)}
                  />
                </div>
              </div>
            )}
          </Drawer.Body>
          <Drawer.Footer>
            <button type="button" className={styles.drawerConfirm}
              disabled={!clienteConfirmable || clienteLoading}
              onClick={() => {
                let factusCliente;
                if (clienteDian) {
                  // Usar datos de DIAN — puede venir en data.data o directo
                  const d = clienteDian.data ?? clienteDian;
                  factusCliente = {
                    identification:           String(d.identification ?? clienteNumeroDeb),
                    names:                    d.names ?? d.razon_social ?? d.nombre,
                    company:                  d.company ?? '',
                    trade_name:               d.trade_name ?? '',
                    address:                  d.address ?? '',
                    email:                    d.email ?? '',
                    phone:                    d.phone ?? '',
                    dv:                       d.dv ?? '',
                    legal_organization_id:    d.legal_organization_id ?? 2,
                    tribute_id:               d.tribute_id ?? 21,
                    identification_document_id: d.identification_document_id ?? DOC_ID_MAP[clienteTipoDoc] ?? 3,
                    municipality_id:          d.municipality_id ?? 980,
                  };
                } else {
                  // Entrada manual
                  factusCliente = {
                    identification:            clienteNumeroDeb,
                    names:                     nombreManual.trim(),
                    company:                   '',
                    trade_name:                '',
                    address:                   '',
                    email:                     '',
                    phone:                     '',
                    dv:                        '',
                    legal_organization_id:     2,
                    tribute_id:                21,
                    identification_document_id: DOC_ID_MAP[clienteTipoDoc] ?? 3,
                    municipality_id:           980,
                  };
                }
                setValue('cliente_factus', factusCliente);
                setDrawerOpen(false);
              }}>
              {clienteConfirmable ? 'Confirmar cliente' : 'Ingresa el número de documento'}
            </button>
          </Drawer.Footer>
        </Drawer.Panel>
      </Drawer>
    </div>
  );
}
