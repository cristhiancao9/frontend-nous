import { useQuery } from 'react-query';
import { getDashboardMetricas, getVentasPorHora } from '../api/dashboard.api';

export const DASHBOARD_KEYS = {
  metricas:   (tiendaId) => ['dashboard', 'metricas', tiendaId],
  ventasHora: (tiendaId, fecha) => ['dashboard', 'ventas-hora', tiendaId, fecha],
};

export function useDashboardMetricas(tiendaId) {
  return useQuery(
    DASHBOARD_KEYS.metricas(tiendaId),
    () => getDashboardMetricas(tiendaId),
    { staleTime: 30_000, enabled: !!tiendaId }
  );
}

export function useVentasPorHora(tiendaId, fecha) {
  return useQuery(
    DASHBOARD_KEYS.ventasHora(tiendaId, fecha),
    () => getVentasPorHora(tiendaId, fecha),
    { staleTime: 30_000, enabled: !!tiendaId }
  );
}
