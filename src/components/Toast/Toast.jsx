import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle size={18} />,
  error:   <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info:    <Info size={18} />,
};

let uid = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
  }, []);

  const toast = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = ++uid;
    setToasts((prev) => [...prev, { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // Convenience methods
  toast.success = (msg, opts) => toast({ message: msg, type: 'success', ...opts });
  toast.error   = (msg, opts) => toast({ message: msg, type: 'error',   ...opts });
  toast.warning = (msg, opts) => toast({ message: msg, type: 'warning', ...opts });
  toast.info    = (msg, opts) => toast({ message: msg, type: 'info',    ...opts });

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className={styles.container} role="region" aria-label="Notificaciones">
          {toasts.map((t) => (
            <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
              <span className={styles.icon}>{ICONS[t.type]}</span>
              <p className={styles.message}>{t.message}</p>
              <button
                type="button"
                className={styles.close}
                onClick={() => dismiss(t.id)}
                aria-label="Cerrar"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
