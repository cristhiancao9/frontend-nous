import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  getInventario,
  ajusteInventario,
  getRecepciones,
  getRecepcion,
  crearRecepcion,
  subirXMLRecepcion,
  escanearItem,
  cerrarRecepcion,
  getResumenVerificacion,
  buscarProducto,
} from '../api/inventario.api';

export const INVENTARIO_KEYS = {
  all:        ['inventario'],
  list:       (params) => ['inventario', params],
  recepciones: ['recepciones'],
};

const normalizeProducto = (p) => ({
  ...p,
  id:           p.id          ?? p.sku_id,
  nombre:       p.nombre      ?? p.nombre_koaj,
  stock_minimo: p.stock_minimo ?? 5,
});

const normalizeInventario = (data) => {
  const list = Array.isArray(data)
    ? data
    : (data?.inventario ?? data?.productos ?? []);
  return { productos: list.map(normalizeProducto) };
};

export function useInventario(params) {
  return useQuery(
    INVENTARIO_KEYS.list(params),
    () => getInventario(params).then(normalizeInventario),
    { staleTime: 30_000 }
  );
}

export function useAjusteInventario() {
  const qc = useQueryClient();
  return useMutation(ajusteInventario, {
    onSuccess: () => qc.invalidateQueries(INVENTARIO_KEYS.all),
  });
}

export function useRecepciones() {
  return useQuery(
    INVENTARIO_KEYS.recepciones,
    getRecepciones,
    { staleTime: 30_000 }
  );
}

export function useCrearRecepcion() {
  const qc = useQueryClient();
  return useMutation(crearRecepcion, {
    onSuccess: () => {
      qc.invalidateQueries(INVENTARIO_KEYS.recepciones);
      qc.invalidateQueries(INVENTARIO_KEYS.all);
    },
  });
}

export function useSubirXML() {
  const qc = useQueryClient();
  return useMutation(subirXMLRecepcion, {
    onSuccess: () => {
      qc.invalidateQueries(INVENTARIO_KEYS.recepciones);
      qc.invalidateQueries(INVENTARIO_KEYS.all);
    },
  });
}

export function useRecepcion(id) {
  return useQuery(
    ['recepciones', id],
    () => getRecepcion(id),
    { staleTime: 10_000, enabled: !!id }
  );
}

export function useEscanearItem(id) {
  const qc = useQueryClient();
  return useMutation(({ ean, force_sku_id }) => escanearItem({ id, ean, force_sku_id }), {
    onSuccess: () => {
      qc.invalidateQueries(['recepciones', id]);
      qc.invalidateQueries(INVENTARIO_KEYS.recepciones);
    },
  });
}

export function useCerrarRecepcion() {
  const qc = useQueryClient();
  return useMutation(cerrarRecepcion, {
    onSuccess: () => {
      qc.invalidateQueries(INVENTARIO_KEYS.recepciones);
    },
  });
}

export function useResumenVerificacion(id) {
  return useQuery(
    ['recepciones', id, 'resumen'],
    () => getResumenVerificacion(id),
    { staleTime: 10_000, enabled: !!id }
  );
}

export function useBuscarProductoEAN(ean, tiendaId, { enabled } = {}) {
  return useQuery(
    ['inventario', 'buscar', 'ean', ean, tiendaId],
    () => buscarProducto({ ean, tienda_id: tiendaId }),
    { staleTime: 60_000, enabled: enabled ?? (!!ean && !!tiendaId) }
  );
}

export function useBuscarProductoNombre(q, tiendaId, { enabled } = {}) {
  return useQuery(
    ['inventario', 'buscar', 'nombre', q, tiendaId],
    () => buscarProducto({ q, tienda_id: tiendaId }),
    { staleTime: 30_000, enabled: enabled ?? (!!q && q.length >= 2 && !!tiendaId) }
  );
}
