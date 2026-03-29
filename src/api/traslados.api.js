import api from './axios';

export const getTraslados    = (params) => api.get('/traslados', { params }).then((r) => r.data);
export const getTraslado     = (id)     => api.get(`/traslados/${id}`).then((r) => r.data);
export const crearTraslado   = (data)   => api.post('/traslados', data).then((r) => r.data);
export const despacharTraslado = (id)   => api.put(`/traslados/${id}/despachar`).then((r) => r.data);
export const recibirTraslado   = (id)   => api.put(`/traslados/${id}/recibir`).then((r) => r.data);
