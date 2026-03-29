import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  crearVenta,
  getVentasByTienda,
  getVentaById,
  anularVenta,
} from '../api/ventas.api';

export const VENTAS_KEYS = {
  all:       ['ventas'],
  byTienda:  (id, params) => ['ventas', id, params],
  detail:    (id)         => ['ventas', id],
  fe:        (id)         => ['ventas', 'fe', id],
};

// Normaliza campos del backend al contrato del frontend
const normalizeVenta = (v) => ({
  ...v,
  created_at: v.created_at ?? v.creado_en,
  estado_fe:  v.estado_fe  ?? v.estado_dian,
});

const normalizeList = (data) => {
  const list = Array.isArray(data) ? data : (data?.ventas ?? []);
  return { ventas: list.map(normalizeVenta) };
};

export function useVentasByTienda(tiendaId, params) {
  return useQuery(
    VENTAS_KEYS.byTienda(tiendaId, params),
    () => getVentasByTienda(tiendaId, params).then(normalizeList),
    { staleTime: 30_000, enabled: !!tiendaId }
  );
}

export function useVentaDetail(id) {
  return useQuery(
    VENTAS_KEYS.detail(id),
    () => getVentaById(id).then((data) => ({
      ...data,
      venta: data.venta ? normalizeVenta(data.venta) : normalizeVenta(data),
    })),
    { staleTime: 10_000, enabled: !!id }
  );
}

export function useCrearVenta() {
  const qc = useQueryClient();
  return useMutation(crearVenta, {
    onSuccess: () => {
      qc.invalidateQueries(VENTAS_KEYS.all);
    },
  });
}

export function useAnularVenta() {
  const qc = useQueryClient();
  return useMutation(anularVenta, {
    onSuccess: (_, id) => {
      qc.invalidateQueries(VENTAS_KEYS.all);
      qc.invalidateQueries(VENTAS_KEYS.detail(id));
    },
  });
}
