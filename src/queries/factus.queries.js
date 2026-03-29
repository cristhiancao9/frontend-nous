import { useQuery, useMutation } from 'react-query';
import {
  getClienteFactus,
  getFacturaElectronica,
  reenviarEmail,
} from '../api/factus.api';

export const FACTUS_KEYS = {
  cliente:  (params) => ['factus', 'cliente', params],
  factura:  (id)     => ['factus', 'factura', id],
};

export function useClienteFactus(params) {
  return useQuery(
    FACTUS_KEYS.cliente(params),
    () => getClienteFactus(params),
    {
      staleTime: 60_000,
      enabled: !!(params?.tipo_doc && params?.numero),
    }
  );
}

export function useFacturaElectronica(id, { pendiente } = {}) {
  return useQuery(
    FACTUS_KEYS.factura(id),
    () => getFacturaElectronica(id),
    {
      staleTime: 5_000,
      enabled: !!id,
      refetchInterval: pendiente ? 5_000 : false,
    }
  );
}

export function useReenviarEmail() {
  return useMutation(reenviarEmail);
}
