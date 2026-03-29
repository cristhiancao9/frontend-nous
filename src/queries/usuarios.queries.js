import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getUsuarios, registerUsuario, toggleUsuario } from '../api/auth.api';

export const useUsuarios = () =>
  useQuery(['usuarios'], getUsuarios);

export const useRegistrarUsuario = () => {
  const qc = useQueryClient();
  return useMutation(registerUsuario, {
    onSuccess: () => qc.invalidateQueries(['usuarios']),
  });
};

export const useToggleUsuario = () => {
  const qc = useQueryClient();
  return useMutation(toggleUsuario, {
    onSuccess: () => qc.invalidateQueries(['usuarios']),
  });
};
