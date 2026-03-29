import api from './axios';

export const crearDevolucion = (data) =>
  api.post('/devoluciones', data).then((r) => r.data);

export const getDevolucion = (id) =>
  api.get(`/devoluciones/${id}`).then((r) => r.data);
