import api from './axios';

export const crearVenta = (data) =>
  api.post('/ventas', data).then((r) => r.data);

export const getVentasByTienda = (tiendaId, params) =>
  api.get(`/ventas/tienda/${tiendaId}`, { params }).then((r) => r.data);

export const getVentaById = (id) =>
  api.get(`/ventas/${id}`).then((r) => r.data);

export const anularVenta = (id) =>
  api.post(`/ventas/${id}/anular`).then((r) => r.data);
