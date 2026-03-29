import { useQuery, useMutation, useQueryClient } from 'react-query';
import { abrirCaja, getCajaActiva, cerrarCaja } from '../api/factus.api';
import api from '../api/axios';

export const CAJAS_KEYS = {
  all:    ['cajas'],
  activa: (tiendaId) => ['cajas', 'activa', tiendaId],
};

const normalizeCaja = (raw) => {
  if (!raw) return null;
  // el backend puede devolver el objeto directo o envuelto en { caja: {...} }
  const c = raw?.caja ?? raw;
  return {
    caja: {
      ...c,
      apertura:      c.apertura      ?? c.abierta_en,
      cierre:        c.cierre        ?? c.cerrada_en,
      saldo_inicial: c.saldo_inicial ?? c.base_apertura ?? 0,
      saldo_actual:       c.saldo_actual       ?? c.total_efectivo ?? 0,
      total_ventas:       c.total_ventas       ??
        ((c.total_efectivo ?? 0) + (c.total_tarjeta ?? 0) + (c.total_transferencia ?? 0)),
      transacciones:      c.transacciones      ?? 0,
      total_devoluciones: c.total_devoluciones ?? 0,
      num_devoluciones:   c.num_devoluciones   ?? 0,
    },
  };
};

export function useCajaActiva(tiendaId) {
  return useQuery(
    CAJAS_KEYS.activa(tiendaId),
    () => getCajaActiva(tiendaId)
      .then(normalizeCaja)
      .catch((err) => {
        // 404 = no hay caja abierta hoy, no es un error real
        if (err?.response?.status === 404) return null;
        throw err;
      }),
    {
      staleTime: 60_000,
      refetchInterval: 60_000,
      enabled: !!tiendaId,
    }
  );
}

export function useAbrirCaja() {
  const qc = useQueryClient();
  return useMutation(abrirCaja, {
    onSuccess: () => qc.invalidateQueries(CAJAS_KEYS.all),
  });
}

export function useCerrarCaja() {
  const qc = useQueryClient();
  return useMutation(({ id, data }) => cerrarCaja(id, data), {
    onSuccess: () => qc.invalidateQueries(CAJAS_KEYS.all),
  });
}

export function useHistorialCajas(tiendaId) {
  return useQuery(
    ['cajas', 'historial', tiendaId],
    () => api.get('/ventas/cajas', { params: { tienda_id: tiendaId } }).then((r) => r.data),
    { staleTime: 60_000, enabled: !!tiendaId }
  );
}
