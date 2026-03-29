import { useMutation, useQuery, useQueryClient } from 'react-query';
import { crearDevolucion, getDevolucion } from '../api/devoluciones.api';
import { INVENTARIO_KEYS } from './inventario.queries';

export function useCrearDevolucion() {
  const qc = useQueryClient();
  return useMutation(crearDevolucion, {
    onSuccess: () => {
      qc.invalidateQueries(INVENTARIO_KEYS.all);
      qc.invalidateQueries(['ventas']);
    },
  });
}

export function useDevolucion(id) {
  return useQuery(
    ['devoluciones', id],
    () => getDevolucion(id),
    { enabled: !!id, staleTime: 30_000 }
  );
}
