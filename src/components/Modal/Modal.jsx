import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

const ModalContext = createContext(null);

function useModalCtx() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('Modal sub-component must be used inside <Modal>');
  return ctx;
}

/* ── Root ── */
function Modal({ children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, close]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <ModalContext.Provider value={{ open, close, toggle }}>
      {children}
    </ModalContext.Provider>
  );
}

/* ── Trigger ── */
function Trigger({ children, asChild = false }) {
  const { toggle } = useModalCtx();
  if (asChild) {
    return <span onClick={toggle} style={{ display: 'contents' }}>{children}</span>;
  }
  return (
    <button type="button" className={styles.trigger} onClick={toggle}>
      {children}
    </button>
  );
}

/* ── Overlay + Content ── */
function Content({ children, size = 'md' }) {
  const { open, close } = useModalCtx();

  if (!open) return null;

  return createPortal(
    <div className={styles.overlay} onClick={close} role="dialog" aria-modal="true">
      <div
        className={`${styles.content} ${styles[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ── Header ── */
function Header({ children }) {
  const { close } = useModalCtx();
  return (
    <div className={styles.header}>
      <h2 className={styles.title}>{children}</h2>
      <button type="button" className={styles.closeBtn} onClick={close} aria-label="Cerrar">
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

/* ── CloseButton ── */
function CloseButton({ children = 'Cancelar', variant = 'ghost' }) {
  const { close } = useModalCtx();
  return (
    <button type="button" className={`${styles.btn} ${styles[variant]}`} onClick={close}>
      {children}
    </button>
  );
}

Modal.Trigger     = Trigger;
Modal.Content     = Content;
Modal.Header      = Header;
Modal.Body        = Body;
Modal.Footer      = Footer;
Modal.CloseButton = CloseButton;

export default Modal;
