import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Mail, MailCheck } from 'lucide-react';
import { Button, FormField, Input, useToast } from '@/shared/ui';
import { AuthHeading } from './components/AuthHeading';
import { FormAlert } from './components/FormAlert';
import { PasswordInput } from './components/PasswordInput';
import { PasswordStrengthMeter } from './components/PasswordStrengthMeter';
import { useConfirmPasswordReset, useRequestPasswordReset } from './api';
import {
  resetConfirmSchema,
  resetRequestSchema,
  type ResetConfirmValues,
  type ResetRequestValues,
} from './validation';
import { applyApiErrors } from './helpers';

function BackToLogin() {
  return (
    <footer className="mt-7 border-t border-ink-100 pt-6 text-center text-sm text-ink-700">
      Pamiętasz hasło?{' '}
      <Link
        to="/logowanie"
        className="font-semibold text-green-800 transition hover:text-green-700"
      >
        Zaloguj się
      </Link>
    </footer>
  );
}

/** Step 1: request a reset link by e-mail (`POST /auth/password/reset/`). */
function ResetRequestForm() {
  const requestReset = useRequestPasswordReset();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetRequestValues>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }: ResetRequestValues) => {
    setFormError(null);
    try {
      await requestReset.mutateAsync({ email });
      setSentTo(email);
    } catch (err) {
      setFormError(
        applyApiErrors(err, setError, ['email'], 'Nie udało się wysłać linku. Spróbuj ponownie.'),
      );
    }
  };

  if (sentTo) {
    return (
      <>
        <div className="mb-6 grid size-14 place-items-center rounded-full bg-green-50 text-green-700">
          <MailCheck className="size-7" aria-hidden="true" />
        </div>
        <AuthHeading
          title="Sprawdź skrzynkę"
          subtitle={`Jeśli konto powiązane z adresem ${sentTo} istnieje, wysłaliśmy na nie link do zresetowania hasła.`}
        />
        <p className="text-[13px] leading-relaxed text-ink-500">
          Nie widzisz wiadomości? Zajrzyj do folderu spam lub{' '}
          <span className="whitespace-nowrap">
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="font-medium text-green-800 underline underline-offset-2 hover:text-green-700"
            >
              spróbuj ponownie
            </button>
            .
          </span>
        </p>
        <BackToLogin />
      </>
    );
  }

  return (
    <>
      <AuthHeading
        title="Zresetuj hasło"
        subtitle="Podaj e-mail powiązany z kontem — wyślemy link do ustawienia nowego hasła."
      />
      <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && <FormAlert>{formError}</FormAlert>}
        <FormField label="E-mail" htmlFor="reset_email" error={errors.email?.message}>
          <Input
            id="reset_email"
            type="email"
            autoComplete="email"
            placeholder="ty@example.com"
            leadingIcon={<Mail className="size-4" />}
            invalid={!!errors.email}
            {...register('email')}
          />
        </FormField>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={requestReset.isPending}
          rightIcon={<ArrowRight className="size-4" />}
        >
          Wyślij link resetujący
        </Button>
      </form>
      <BackToLogin />
    </>
  );
}

/** Step 2: set a new password from the e-mailed `uid` + `token` (PLAN deferred-work note). */
function ResetConfirmForm({ uid, token }: { uid: string; token: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const confirmReset = useConfirmPasswordReset();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<ResetConfirmValues>({
    resolver: zodResolver(resetConfirmSchema),
    defaultValues: { new_password: '', new_password_confirm: '' },
  });

  const onSubmit = async (values: ResetConfirmValues) => {
    setFormError(null);
    try {
      await confirmReset.mutateAsync({
        uid,
        token,
        new_password: values.new_password,
        new_password_confirm: values.new_password_confirm,
      });
      toast({
        variant: 'success',
        title: 'Hasło zostało zmienione',
        description: 'Możesz się teraz zalogować nowym hasłem.',
      });
      navigate('/logowanie', { replace: true });
    } catch (err) {
      setFormError(
        applyApiErrors(
          err,
          setError,
          ['new_password', 'new_password_confirm'],
          'Nie udało się ustawić hasła. Link mógł wygasnąć.',
        ),
      );
    }
  };

  return (
    <>
      <AuthHeading
        title="Ustaw nowe hasło"
        subtitle="Wpisz i potwierdź nowe hasło do swojego konta."
      />
      <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && <FormAlert>{formError}</FormAlert>}
        <FormField label="Nowe hasło" htmlFor="new_password" error={errors.new_password?.message}>
          <PasswordInput
            id="new_password"
            autoComplete="new-password"
            placeholder="Min. 8 znaków"
            invalid={!!errors.new_password}
            {...register('new_password')}
          />
          <PasswordStrengthMeter password={watch('new_password')} />
        </FormField>
        <FormField
          label="Powtórz nowe hasło"
          htmlFor="new_password_confirm"
          error={errors.new_password_confirm?.message}
        >
          <PasswordInput
            id="new_password_confirm"
            autoComplete="new-password"
            placeholder="Wpisz hasło ponownie"
            invalid={!!errors.new_password_confirm}
            {...register('new_password_confirm')}
          />
        </FormField>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={confirmReset.isPending}
          rightIcon={<ArrowRight className="size-4" />}
        >
          Zapisz nowe hasło
        </Button>
      </form>
      <BackToLogin />
    </>
  );
}

/**
 * Password reset (PLAN §16.2, F1). The reset e-mail links to
 * `/reset-hasla?uid=…&token=…` (B1, already merged) — when those params are present
 * we show the "set new password" step, otherwise the "request a link" step.
 */
export function PasswordResetPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  if (uid && token) return <ResetConfirmForm uid={uid} token={token} />;
  return <ResetRequestForm />;
}

export default PasswordResetPage;
