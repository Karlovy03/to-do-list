import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
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

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={[css.input, className].filter(Boolean).join(' ')} {...p} />;
});

export function TextArea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={[css.input, css.textarea, className].filter(Boolean).join(' ')} {...p} />;
}

export function Select({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={[css.input, className].filter(Boolean).join(' ')} {...p} />;
}

export function FormError({ children }: { children?: ReactNode }) {
  return children ? <p className={css.error} role="alert">{children}</p> : null;
}
