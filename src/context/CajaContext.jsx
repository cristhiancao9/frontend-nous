import { createContext, useContext } from 'react';
import { useCajaActiva } from '../queries/cajas.queries';
import { useAuth } from './AuthContext';

const CajaContext = createContext(null);

export function CajaProvider({ children }) {
  const { user } = useAuth();
  const tiendaId = user?.tienda_id;

  const { data, isLoading, refetch } = useCajaActiva(tiendaId);

  // El backend devuelve la caja directamente o 404 si no hay ninguna abierta
  const cajaActiva = data?.caja?.id ? data.caja : null;

  return (
    <CajaContext.Provider value={{ cajaActiva, isLoading, refetch }}>
      {children}
    </CajaContext.Provider>
  );
}

export function useCaja() {
  const ctx = useContext(CajaContext);
  if (!ctx) throw new Error('useCaja must be used inside <CajaProvider>');
  return ctx;
}
