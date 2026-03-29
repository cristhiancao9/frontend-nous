import api from './axios';

export const loginRequest    = (credentials) => api.post('/auth/login', credentials).then((r) => r.data);
export const registerUsuario = (data)        => api.post('/auth/register', data).then((r) => r.data);
export const getUsuarios     = ()            => api.get('/auth/usuarios').then((r) => r.data);
export const toggleUsuario   = (id)          => api.patch(`/auth/usuarios/${id}/toggle`).then((r) => r.data);
