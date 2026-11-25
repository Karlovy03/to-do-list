import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import css from './Toast.module.css';

const ToastContext = createContext<(message: string) => void>(() => undefined);

/** Коротке підтвердження дії; замість alert() */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMessage(m);
    window.setTimeout(() => setMessage((cur) => (cur === m ? null : cur)), 2800);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {message &&
        createPortal(
          <div className={css.toast} role="status">
            {message}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
