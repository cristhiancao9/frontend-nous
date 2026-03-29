import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ReceiptText,
  TrendingUp,
  Archive,
  RotateCcw,
  Truck,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

// roles: qué roles pueden ver este ítem
const NAV_ITEMS = [
  { to: '/dashboard',    icon: <LayoutDashboard size={20} />, label: 'Dashboard',      roles: ['admin', 'vendedor'] },
  { to: '/pos',          icon: <ShoppingCart size={20} />,    label: 'Punto de Venta', roles: ['admin', 'vendedor'] },
  { to: '/inventario',   icon: <Package size={20} />,         label: 'Inventario',     roles: ['admin', 'vendedor', 'bodega'] },
  { to: '/ventas',       icon: <TrendingUp size={20} />,      label: 'Ventas',         roles: ['admin'] },
  { to: '/recepciones',  icon: <Archive size={20} />,         label: 'Recepciones',    roles: ['admin', 'bodega'] },
  { to: '/traslados',    icon: <Truck size={20} />,           label: 'Traslados',       roles: ['admin', 'bodega'] },
  { to: '/cajas',        icon: <ReceiptText size={20} />,     label: 'Cajas',          roles: ['admin'] },
  { to: '/devoluciones', icon: <RotateCcw size={20} />,       label: 'Devoluciones',   roles: ['admin', 'vendedor'] },
  { to: '/usuarios',     icon: <Users size={20} />,           label: 'Usuarios',        roles: ['admin'] },
];

function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  const rol = user?.rol;
  const itemsVisibles = NAV_ITEMS.filter(({ roles }) => roles.includes(rol));

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoMark}>N</div>
        {!collapsed && <span className={styles.logoText}>NOUS RETAIL</span>}
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {itemsVisibles.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <span className={styles.navIcon}>{icon}</span>
            {!collapsed && <span className={styles.navLabel}>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Toggle */}
      <button
        type="button"
        className={styles.toggleBtn}
        onClick={onToggle}
        aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        {!collapsed && <span>Colapsar</span>}
      </button>
    </aside>
  );
}

export default Sidebar;
