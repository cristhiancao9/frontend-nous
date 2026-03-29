import api from './axios';

export const getDashboardMetricas = (tiendaId) =>
  api.get('/dashboard/metricas', { params: { tienda_id: tiendaId } }).then((r) => r.data);

export const getVentasPorHora = (tiendaId, fecha) =>
  api.get('/dashboard/ventas-por-hora', {
    params: { tienda_id: tiendaId, fecha },
  }).then((r) => r.data);
