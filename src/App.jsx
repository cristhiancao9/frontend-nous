import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CajaProvider } from './context/CajaContext';
import { ToastProvider } from './components/Toast/Toast';
import AppLayout from './components/Layout/AppLayout';

/* Pages */
import Login        from './pages/Login/Login';
import Dashboard    from './pages/Dashboard/Dashboard';
import POS          from './pages/POS/POS';
import Inventario   from './pages/Inventario/Inventario';
import Ventas       from './pages/Ventas/Ventas';
import Recepciones  from './pages/Recepciones/Recepciones';
import Cajas        from './pages/Cajas/Cajas';
import Devoluciones from './pages/Devoluciones/Devoluciones';
import Usuarios    from './pages/Usuarios/Usuarios';
import Traslados   from './pages/Traslados/Traslados';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Página de inicio según rol
const HOME_POR_ROL = {
  admin:    '/dashboard',
  vendedor: '/pos',
  bodega:   '/recepciones',
};

// Ruta protegida: requiere auth + rol permitido
function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.rol)) {
    return <Navigate to={HOME_POR_ROL[user?.rol] ?? '/login'} replace />;
  }
  return children;
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();
  const homeRol = HOME_POR_ROL[user?.rol] ?? '/dashboard';

  return (
    <Routes>
      {/* Login: si ya está autenticado, ir al home del rol */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={homeRol} replace /> : <Login />}
      />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={
          <ProtectedRoute roles={['admin', 'vendedor']}><Dashboard /></ProtectedRoute>
        } />
        <Route path="/pos" element={
          <ProtectedRoute roles={['admin', 'vendedor']}><POS /></ProtectedRoute>
        } />
        <Route path="/inventario" element={
          <ProtectedRoute roles={['admin', 'vendedor', 'bodega']}><Inventario /></ProtectedRoute>
        } />
        <Route path="/ventas" element={
          <ProtectedRoute roles={['admin']}><Ventas /></ProtectedRoute>
        } />
        <Route path="/recepciones" element={
          <ProtectedRoute roles={['admin', 'bodega']}><Recepciones /></ProtectedRoute>
        } />
        <Route path="/cajas" element={
          <ProtectedRoute roles={['admin']}><Cajas /></ProtectedRoute>
        } />
        <Route path="/devoluciones" element={
          <ProtectedRoute roles={['admin', 'vendedor']}><Devoluciones /></ProtectedRoute>
        } />
        <Route path="/traslados" element={
          <ProtectedRoute roles={['admin', 'bodega']}><Traslados /></ProtectedRoute>
        } />
        <Route path="/usuarios" element={
          <ProtectedRoute roles={['admin']}><Usuarios /></ProtectedRoute>
        } />
      </Route>

      {/* Fallback: home del rol o login */}
      <Route path="*" element={
        isAuthenticated
          ? <Navigate to={homeRol} replace />
          : <Navigate to="/login" replace />
      } />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CajaProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ToastProvider>
        </CajaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
