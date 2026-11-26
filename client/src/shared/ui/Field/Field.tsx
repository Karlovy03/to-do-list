import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import css from './Field.module.css';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}

/** Підпис + поле + підказка/помилка */
export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className={css.field}>
      <span className={css.label}>{label}</span>
      {children}
      {hint && !error && <span className={css.hint}>{hint}</span>}
      {error && <span className={css.error} role="alert">{error}</span>}
    </label>
  );
}

/**
 * Підпис над групою кнопок (капсули, вкладки). Не <label>: клік по підпису
 * інакше «натискав» би першу кнопку групи.
 */
export function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className={css.field} role="group" aria-label={label}>
      <span className={css.label}>{label}</span>
      {children}
      {hint && <span className={css.hint}>{hint}</span>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={[css.input, className].filter(Boolean).join(' ')} {...p} />;
});

export function TextArea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={[css.input, css.textarea, className].filter(Boolean).join(' ')} {...p} />;
}


export function FormError({ children }: { children?: ReactNode }) {
  return children ? <p className={css.error} role="alert">{children}</p> : null;
}
