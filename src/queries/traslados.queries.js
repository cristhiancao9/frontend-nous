import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getTraslados, getTraslado, crearTraslado, despacharTraslado, recibirTraslado } from '../api/traslados.api';

export const useTraslados = (params) =>
  useQuery(['traslados', params], () => getTraslados(params), { keepPreviousData: true });

export const useTraslado = (id) =>
  useQuery(['traslado', id], () => getTraslado(id), { enabled: !!id });

export const useCrearTraslado = () => {
  const qc = useQueryClient();
  return useMutation(crearTraslado, {
    onSuccess: () => qc.invalidateQueries(['traslados']),
  });
};

export const useDespacharTraslado = () => {
  const qc = useQueryClient();
  return useMutation(despacharTraslado, {
    onSuccess: (_, id) => {
      qc.invalidateQueries(['traslados']);
      qc.invalidateQueries(['traslado', id]);
    },
  });
};

export const useRecibirTraslado = () => {
  const qc = useQueryClient();
  return useMutation(recibirTraslado, {
    onSuccess: (_, id) => {
      qc.invalidateQueries(['traslados']);
      qc.invalidateQueries(['traslado', id]);
    },
  });
};
