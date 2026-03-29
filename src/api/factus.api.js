import api from './axios';

export const getClienteFactus = (params) =>
  api.get('/ventas/factus/cliente', { params }).then((r) => r.data);

export const getFacturaElectronica = (id) =>
  api.get(`/ventas/factus/factura/${id}`).then((r) => r.data);

export const getFacturaPDF = (id) =>
  api.get(`/ventas/factus/factura/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data);

export const reenviarEmail = (id) =>
  api.post(`/ventas/factus/factura/${id}/email`).then((r) => r.data);

/* Cajas */
export const abrirCaja = (data) =>
  api.post('/ventas/cajas/abrir', data).then((r) => r.data);

export const getCajaActiva = (tiendaId) =>
  api.get(`/ventas/cajas/activa/${tiendaId}`).then((r) => r.data);

export const cerrarCaja = (id, data) =>
  api.post(`/ventas/cajas/${id}/cerrar`, data).then((r) => r.data);
