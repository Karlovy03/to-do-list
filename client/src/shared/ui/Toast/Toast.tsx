import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from '../Icon';
import css from './Toast.module.css';

interface ToastOptions {
  /** підпис дії, напр. «Скасувати» */
  actionLabel?: string;
  onAction?: () => void;
  /** скільки показувати, мс */
  duration?: number;
  /** типово «галочка» — підтвердження; «дзвіник» — новина (Figma 39) */
  icon?: IconName;
}

type Show = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<Show>(() => undefined);

/** Коротке підтвердження дії замість alert() і діалогів; може мати дію «Скасувати» */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; options: ToastOptions; id: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback<Show>((message, options = {}) => {
    window.clearTimeout(timer.current);
    const id = Date.now();
    setToast({ message, options, id });
    timer.current = window.setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), options.duration ?? 3000);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast &&
        createPortal(
          <div className={toast.options.icon && toast.options.icon !== 'check' ? `${css.toast} ${css.news}` : css.toast} role="status">
            <Icon name={toast.options.icon ?? 'check'} size={20} />
            <span className={css.text}>{toast.message}</span>
            {toast.options.actionLabel && (
              <button
                type="button"
                className={css.action}
                onClick={() => {
                  toast.options.onAction?.();
                  setToast(null);
                }}
              >
                {toast.options.actionLabel}
              </button>
            )}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
