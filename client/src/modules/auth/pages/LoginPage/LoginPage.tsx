import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { BrandMark, Button, Field, FormError, Input } from '@/shared/ui';
import { useLogin, useSession } from '../../hooks/useSession';
import css from './LoginPage.module.css';

export function LoginPage() {
  const { me } = useSession();
  const login = useLogin();
  const [form, setForm] = useState({ login: '', password: '' });
  if (me) return <Navigate to="/" replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate(form);
  };

  return (
    <main className={css.page}>
      <div className={css.brand}>
        <BrandMark size={72} label={t('shared.ui.brand')} />
        <h1 className={css.title}>{t('auth.login.title')}</h1>
        <p className={css.subtitle}>{t('auth.login.subtitle')}</p>
      </div>
      <form className={css.form} onSubmit={submit}>
        <Field label={t('auth.login.login')}>
          <Input autoComplete="username" autoCapitalize="none" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} required />
        </Field>
        <Field label={t('auth.login.password')}>
          <Input type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </Field>
        <FormError>{login.error ? errorText(login.error) : null}</FormError>
        <Button type="submit" variant="primary" size="l" block disabled={login.isPending}>
          {t('auth.login.submit')}
        </Button>
        <p className={css.hint}>{t('auth.login.hint')}</p>
      </form>
    </main>
  );
}
