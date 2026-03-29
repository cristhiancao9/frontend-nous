import { createContext, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './Drawer.module.css';

const DrawerContext = createContext(null);

function useDrawerCtx() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error('Drawer sub-component must be used inside <Drawer>');
  return ctx;
}

/* ── Root ── */
function Drawer({ children, open, onClose, side = 'right', width = 420 }) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <DrawerContext.Provider value={{ open, onClose, side, width }}>
      {children}
    </DrawerContext.Provider>
  );
}

/* ── Panel ── */
function Panel({ children }) {
  const { open, onClose, side, width } = useDrawerCtx();

  if (!open) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.panel} ${styles[side]}`}
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ── Header ── */
function Header({ children }) {
  const { onClose } = useDrawerCtx();
  return (
    <div className={styles.header}>
      <h3 className={styles.title}>{children}</h3>
      <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
        <X size={18} />
      </button>
    </div>
  );
}

/* ── Body ── */
function Body({ children }) {
  return <div className={styles.body}>{children}</div>;
}

/* ── Footer ── */
function Footer({ children }) {
  return <div className={styles.footer}>{children}</div>;
}

Drawer.Panel  = Panel;
Drawer.Header = Header;
Drawer.Body   = Body;
Drawer.Footer = Footer;

export default Drawer;
