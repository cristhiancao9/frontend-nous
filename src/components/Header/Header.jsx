import { User, Store, LogOut, AlertCircle, CheckCircle, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCaja } from '../../context/CajaContext';
import { useTheme } from '../../context/ThemeContext';
import styles from './Header.module.css';

function Header({ sidebarCollapsed }) {
  const { user, logout } = useAuth();
  const { cajaActiva } = useCaja();
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className={styles.header}
      style={{
        left: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
      }}
    >
      {/* Left: store + caja status */}
      <div className={styles.left}>
        <div className={styles.storeChip}>
          <Store size={14} />
          <span>{user?.tienda_id ? `Tienda ${user.tienda_id}` : 'Sin tienda'}</span>
        </div>
        <div className={`${styles.cajaChip} ${cajaActiva ? styles.cajaOpen : styles.cajaClosed}`}>
          {cajaActiva ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
          <span>{cajaActiva ? `Caja #${cajaActiva.id}` : 'Caja cerrada'}</span>
        </div>
      </div>

      {/* Right: user info + logout */}
      <div className={styles.right}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            <User size={16} />
          </div>
          <div className={styles.userMeta}>
            <span className={styles.userName}>{user?.nombre ?? '—'}</span>
            <span className={styles.userRole}>{user?.rol ?? ''}</span>
          </div>
        </div>
        <button
          type="button"
          className={styles.themeBtn}
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          type="button"
          className={styles.logoutBtn}
          onClick={logout}
          title="Cerrar sesión"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

export default Header;
