import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Mail } from 'lucide-react';
import { Button, Checkbox, FormField, Input } from '@/shared/ui';
import { AuthHeading } from './components/AuthHeading';
import { FormAlert } from './components/FormAlert';
import { PasswordInput } from './components/PasswordInput';
import { SsoButtons } from './components/SsoButtons';
import { useLogin } from './api';
import { loginSchema, type LoginValues } from './validation';
import { applyApiErrors, getRoleHome, getSafeNext } from './helpers';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      const user = await login.mutateAsync(values);
      const next = getSafeNext(searchParams.get('next'));
      navigate(next ?? getRoleHome(user.role), { replace: true });
    } catch (err) {
      setFormError(
        applyApiErrors(err, setError, ['email', 'password'], 'Nieprawidłowy e-mail lub hasło.'),
      );
    }
  };

  return (
    <>
      <AuthHeading
        title="Cześć ponownie!"
        subtitle="Zaloguj się i zarezerwuj ogród dla swojego psa."
      />

      <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && <FormAlert>{formError}</FormAlert>}

        <FormField label="E-mail" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="ty@example.com"
            leadingIcon={<Mail className="size-4" />}
            invalid={!!errors.email}
            {...register('email')}
          />
        </FormField>

        <FormField
          htmlFor="password"
          error={errors.password?.message}
          label={
            <span className="flex w-full items-baseline justify-between gap-3">
              Hasło
              <Link
                to="/reset-hasla"
                className="text-xs font-medium text-green-800 transition hover:text-green-700 hover:underline hover:underline-offset-2"
              >
                Zapomniałeś hasła?
              </Link>
            </span>
          }
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Wpisz hasło"
            invalid={!!errors.password}
            {...register('password')}
          />
        </FormField>

        <Checkbox label="Zapamiętaj mnie na 30 dni" {...register('remember')} />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={login.isPending}
          rightIcon={<ArrowRight className="size-4" />}
        >
          Zaloguj się
        </Button>

        <SsoButtons />
      </form>

      <footer className="mt-7 border-t border-ink-100 pt-6 text-center text-sm text-ink-700">
        Nie masz jeszcze konta?{' '}
        <Link
          to="/rejestracja"
          className="font-semibold text-green-800 transition hover:text-green-700"
        >
          Zarejestruj się
        </Link>
      </footer>

      <p className="mx-auto mt-8 max-w-[440px] text-center text-xs leading-relaxed text-ink-500">
        Logując się akceptujesz{' '}
        <Link to="/regulamin" className="underline underline-offset-2 hover:text-green-800">
          Regulamin
        </Link>{' '}
        i{' '}
        <Link
          to="/polityka-prywatnosci"
          className="underline underline-offset-2 hover:text-green-800"
        >
          Politykę prywatności
        </Link>
        .
      </p>
    </>
  );
}

export default LoginPage;
