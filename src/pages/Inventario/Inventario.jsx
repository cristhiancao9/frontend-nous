import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Search, RefreshCw, X, Package,
  AlertTriangle, TrendingDown, TrendingUp, Edit3, DollarSign, Layers,
} from 'lucide-react';
import { useInventario, useAjusteInventario } from '../../queries/inventario.queries';
import { useToast } from '../../components/Toast/Toast';
import { useAuth } from '../../context/AuthContext';
import Table from '../../components/Table/Table';
import Badge from '../../components/Badge/Badge';
import styles from './Inventario.module.css';


/* ── Sub-componente StockCell ── */
function StockCell({ actual, minimo }) {
  const critico = actual <= minimo;
  const bajo    = actual <= minimo * 2 && actual > minimo;
  return (
    <div className={`${styles.stockCell} ${critico ? styles.stockCritico : bajo ? styles.stockBajo : ''}`}>
      {critico && <AlertTriangle size={13} />}
      {!critico && bajo && <TrendingDown size={13} />}
      {!critico && !bajo && actual > minimo * 4 && <TrendingUp size={13} />}
      <span className={styles.stockNum}>{actual}</span>
      <span className={styles.stockMin}>/ {minimo} mín.</span>
    </div>
  );
}

/* ── Sub-componente ModalAjuste ── */
function ModalAjuste({ producto, onClose, onConfirm, isLoading, formatCOP }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      tipo: 'entrada',
      cantidad: '',
      motivo: '',
      stock_nuevo: producto.stock_actual,
    },
  });

  const tipo     = watch('tipo');
  const cantidad = watch('cantidad');

  const stockResultante = useMemo(() => {
    const cant = Number(cantidad) || 0;
    if (tipo === 'entrada')  return producto.stock_actual + cant;
    if (tipo === 'salida')   return Math.max(0, producto.stock_actual - cant);
    if (tipo === 'ajuste')   return cant;
    return producto.stock_actual;
  }, [tipo, cantidad, producto.stock_actual]);

  const onSubmit = handleSubmit((values) => {
    onConfirm({
      tipo: values.tipo,
      cantidad: Number(values.cantidad),
      motivo: values.motivo,
      stock_resultante: stockResultante,
    });
  });

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalMd} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Ajustar stock</h2>
            <p className={styles.modalSubtitle}>{producto.nombre}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit}>
          <div className={styles.modalBody}>
            {/* Info producto */}
            <div className={styles.productoInfo}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>EAN</span>
                <span className={styles.infoVal}>{producto.ean}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Stock actual</span>
                <span className={`${styles.infoVal} ${producto.stock_actual <= producto.stock_minimo ? styles.stockCritico : ''}`}>
                  {producto.stock_actual} {producto.unidad}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Precio venta</span>
                <span className={styles.infoVal}>{formatCOP(producto.precio_venta)}</span>
              </div>
            </div>

            {/* Tipo de ajuste */}
            <div className={styles.formField}>
              <label className={styles.formLabel}>Tipo de movimiento</label>
              <div className={styles.tipoGrid}>
                {[
                  { value: 'entrada', label: 'Entrada',        icon: <TrendingUp size={16} /> },
                  { value: 'salida',  label: 'Salida',         icon: <TrendingDown size={16} /> },
                  { value: 'ajuste',  label: 'Ajuste directo', icon: <Edit3 size={16} /> },
                ].map(({ value, label, icon }) => (
                  <label
                    key={value}
                    className={`${styles.tipoOption} ${tipo === value ? styles.tipoActive : ''}`}
                  >
                    <input type="radio" value={value} {...register('tipo')} hidden />
                    {icon}
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Cantidad */}
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="cantidad">
                {tipo === 'ajuste' ? 'Nuevo stock' : 'Cantidad'}
              </label>
              <input
                id="cantidad"
                type="number"
                min="0"
                step="1"
                className={`${styles.formInput} ${errors.cantidad ? styles.inputError : ''}`}
                placeholder="0"
                {...register('cantidad', {
                  required: 'La cantidad es obligatoria',
                  min: { value: 0, message: 'Mínimo 0' },
                })}
              />
              {errors.cantidad && (
                <span className={styles.errorMsg}>{errors.cantidad.message}</span>
              )}
            </div>

            {/* Motivo */}
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="motivo">Motivo</label>
              <input
                id="motivo"
                type="text"
                className={styles.formInput}
                placeholder="Ej: Inventario físico, Devolución cliente..."
                {...register('motivo')}
              />
            </div>

            {/* Preview stock resultante */}
            <div className={`${styles.stockPreview} ${stockResultante <= producto.stock_minimo ? styles.stockPreviewCritico : ''}`}>
              <span>Stock resultante</span>
              <span className={styles.stockPreviewNum}>
                {stockResultante} {producto.unidad}
                {stockResultante <= producto.stock_minimo && (
                  <span className={styles.stockWarning}> ⚠ Stock crítico</span>
                )}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnGhost} onClick={onClose} disabled={isLoading}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Confirmar ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Componente principal ── */
export default function Inventario() {
  const [modalAjuste, setModalAjuste] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [soloStockCritico, setSoloStockCritico] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useInventario({
    referencia_base: filtroCategoria || undefined,
  });

  const productos = data?.productos ?? [];
  const ajusteMutation = useAjusteInventario();
  const { user } = useAuth();

  const categorias = useMemo(() => [...new Set(productos.map((p) => p.referencia_base).filter(Boolean))], [productos]);
  const toast = useToast();

  // Filtrado local (búsqueda + stock crítico)
  const productosFiltrados = useMemo(() => {
    let lista = productos;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(
        (p) => (p.nombre ?? '').toLowerCase().includes(q) ||
               (p.ean ?? '').includes(q) ||
               (p.referencia_base ?? '').toLowerCase().includes(q)
      );
    }
    if (soloStockCritico) {
      lista = lista.filter((p) => p.stock_actual <= p.stock_minimo);
    }
    return lista;
  }, [productos, busqueda, soloStockCritico]);

  const stockCriticoCount = productos.filter((p) => p.stock_actual <= p.stock_minimo).length;

  const totalUnidades = useMemo(
    () => productos.reduce((sum, p) => sum + (Number(p.stock_actual) || 0), 0),
    [productos]
  );

  const valorTotal = useMemo(
    () => productos.reduce((sum, p) => sum + (Number(p.stock_actual) || 0) * (Number(p.precio_venta) || 0), 0),
    [productos]
  );

  const formatCOP = (v) =>
    '$ ' + Number(v).toLocaleString('es-CO', { minimumFractionDigits: 0 });

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Inventario</h1>
          <p className={styles.pageSubtitle}>Gestión de productos y stock</p>
        </div>
        <button
          className={styles.refreshBtn}
          onClick={refetch}
          disabled={isFetching}
        >
          <RefreshCw size={15} className={isFetching ? styles.spinning : ''} />
          Actualizar
        </button>
      </div>

      {/* Resumen inventario */}
      {!isLoading && productos.length > 0 && (
        <div className={styles.resumenGrid}>
          <div className={styles.resumenCard}>
            <div className={styles.resumenIcon} style={{ background: 'rgba(79,110,247,0.12)', color: 'var(--accent-primary)' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <p className={styles.resumenLabel}>Valor total inventario</p>
              <p className={styles.resumenVal}>{formatCOP(valorTotal)}</p>
              <p className={styles.resumenSub}>a precio de venta</p>
            </div>
          </div>
          <div className={styles.resumenCard}>
            <div className={styles.resumenIcon} style={{ background: 'rgba(0,212,170,0.12)', color: 'var(--accent-secondary)' }}>
              <Layers size={20} />
            </div>
            <div>
              <p className={styles.resumenLabel}>Total unidades</p>
              <p className={styles.resumenVal}>{totalUnidades.toLocaleString('es-CO')}</p>
              <p className={styles.resumenSub}>en {productos.length} referencias</p>
            </div>
          </div>
          <div className={styles.resumenCard}>
            <div className={styles.resumenIcon} style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className={styles.resumenLabel}>Stock crítico</p>
              <p className={styles.resumenVal} style={{ color: stockCriticoCount > 0 ? '#f59e0b' : 'var(--accent-secondary)' }}>
                {stockCriticoCount}
              </p>
              <p className={styles.resumenSub}>{stockCriticoCount > 0 ? 'productos bajo mínimo' : 'todo en orden ✓'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Alertas stock crítico */}
      {stockCriticoCount > 0 && (
        <div className={styles.alertaBanner}>
          <AlertTriangle size={16} />
          <span>
            <strong>{stockCriticoCount}</strong> producto{stockCriticoCount > 1 ? 's' : ''} con
            stock crítico — revisar pedidos
          </span>
        </div>
      )}

      {/* Filtros */}
      <div className={styles.filtersCard}>
        <div className={styles.filtersRow}>
          {/* Búsqueda */}
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por nombre o EAN..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className={styles.searchClear} onClick={() => setBusqueda('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Select referencia */}
          <select
            className={styles.filterSelect}
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
          >
            <option value="">Todas las referencias</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Toggle stock crítico */}
          <button
            type="button"
            className={`${styles.toggleBtn} ${soloStockCritico ? styles.toggleActive : ''}`}
            onClick={() => setSoloStockCritico((v) => !v)}
          >
            <AlertTriangle size={14} />
            Stock crítico
            {stockCriticoCount > 0 && (
              <span className={styles.critCount}>{stockCriticoCount}</span>
            )}
          </button>

          {/* Chips stats */}
          <div className={styles.filterStats}>
            <span className={styles.statChip}>{productosFiltrados.length} productos</span>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className={styles.tableCard}>
        <Table
          data={productosFiltrados}
          pageSize={12}
          onRowClick={(p) => setModalAjuste(p)}
        >
          <Table.Body>
            <Table.Col field="ean" render={(v) => (
              <span className={styles.eanCode}>{v}</span>
            )}>EAN</Table.Col>
            <Table.Col field="nombre" render={(v, row) => (
              <div className={styles.productoCell}>
                <span className={styles.productoNombre}>{v}</span>
                <span className={styles.productoCategoria}>{row.referencia_base}</span>
              </div>
            )}>Producto</Table.Col>
            <Table.Col field="talla">Talla</Table.Col>
            <Table.Col field="color">Color</Table.Col>
            <Table.Col field="precio_venta" align="right" render={(v) => formatCOP(v)}>
              Precio venta
            </Table.Col>
            <Table.Col field="stock_actual" align="center" render={(v, row) => (
              <StockCell actual={v} minimo={row.stock_minimo} />
            )}>Stock</Table.Col>
            <Table.Col field="sku_id" align="right" render={(_, row) => (
              <button
                className={styles.ajusteBtn}
                onClick={(e) => { e.stopPropagation(); setModalAjuste(row); }}
                title="Ajustar stock"
              >
                <Edit3 size={14} />
                Ajustar
              </button>
            )}>Ajuste</Table.Col>
          </Table.Body>
          <Table.Empty>No se encontraron productos con los filtros aplicados</Table.Empty>
          <Table.Pagination />
        </Table>
      </div>

      {/* Modal ajuste */}
      {modalAjuste && (
        <ModalAjuste
          producto={modalAjuste}
          onClose={() => setModalAjuste(null)}
          onConfirm={(values) => {
            ajusteMutation.mutate(
              {
                tienda_id: user.tienda_id,
                motivo: values.motivo || 'Ajuste manual',
                items: [{ ean: modalAjuste.ean, cantidad_real: values.stock_resultante }],
              },
              {
                onSuccess: () => {
                  toast.success('Stock ajustado correctamente');
                  setModalAjuste(null);
                },
                onError: () => toast.error('Error al ajustar el stock'),
              }
            );
          }}
          isLoading={ajusteMutation.isLoading}
          formatCOP={formatCOP}
        />
      )}
    </div>
  );
}
