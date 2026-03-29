import api from './axios';

export const getInventario = (params) =>
  api.get('/inventario', { params }).then((r) => r.data);

export const ajusteInventario = (data) =>
  api.post('/ajustes', data).then((r) => r.data);

export const getRecepciones = () =>
  api.get('/recepciones').then((r) => r.data);

export const crearRecepcion = (data) =>
  api.post('/recepciones', data).then((r) => r.data);

export const subirXMLRecepcion = ({ tienda_id, margen_objetivo, archivo }) => {
  const form = new FormData();
  form.append('tienda_id',       tienda_id);
  form.append('margen_objetivo', margen_objetivo);
  form.append('factura',         archivo);
  return api.post('/recepciones/xml', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

export const getRecepcion          = (id) =>
  api.get(`/recepciones/${id}`).then((r) => r.data);

export const escanearItem = ({ id, ean, force_sku_id }) =>
  api.post(`/recepciones/${id}/escanear`, { ean, ...(force_sku_id ? { force_sku_id } : {}) })
    .then((r) => r.data);

export const cerrarRecepcion       = (id) =>
  api.post(`/recepciones/${id}/cerrar`).then((r) => r.data);

export const getResumenVerificacion = (id) =>
  api.get(`/recepciones/${id}/resumen-verificacion`).then((r) => r.data);

export const buscarProducto = (params) =>
  api.get('/inventario/buscar', { params }).then((r) => r.data);
