import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, File, Mail, Phone, User } from 'lucide-react';
import { Button, Checkbox, FormField, Input } from '@/shared/ui';
import { AccountTypeToggle } from './components/AccountTypeToggle';
import { AuthHeading } from './components/AuthHeading';
import { FormAlert } from './components/FormAlert';
import { PasswordInput } from './components/PasswordInput';
import { PasswordStrengthMeter } from './components/PasswordStrengthMeter';
import { SsoButtons } from './components/SsoButtons';
import { useRegister } from './api';
import { registerSchema, type RegisterValues } from './validation';
import { applyApiErrors, getRoleHome } from './helpers';

const REQUIRED = <span className="font-semibold text-danger">wymagane</span>;
const legalLink = 'text-green-800 underline underline-offset-2 hover:text-green-700';

export function RegisterPage() {
  const navigate = useNavigate();
  const registerMut = useRegister();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'client',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      password_confirm: '',
      rodo_accepted: false,
      terms_accepted: false,
      marketing_consent: false,
    },
  });

  const role = watch('role');
  const password = watch('password');
  const consentsGiven = watch('rodo_accepted') && watch('terms_accepted');

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null);
    try {
      const user = await registerMut.mutateAsync({
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone.replace(/[\s-]/g, ''),
        role: values.role,
        password: values.password,
        password_confirm: values.password_confirm,
        terms_accepted: values.terms_accepted,
        marketing_consent: values.marketing_consent,
      });
      navigate(getRoleHome(user.role), { replace: true });
    } catch (err) {
      setFormError(
        applyApiErrors(
          err,
          setError,
          ['email', 'first_name', 'last_name', 'phone', 'password', 'password_confirm'],
          'Nie udało się założyć konta. Sprawdź dane i spróbuj ponownie.',
        ),
      );
    }
  };

  return (
    <>
      <AuthHeading
        title="Załóż konto w PsiPark"
        subtitle="Wybierz typ konta i wypełnij dane. Zajmie to mniej niż minutę."
      />

      <AccountTypeToggle value={role} onChange={(v) => setValue('role', v)} />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && <FormAlert>{formError}</FormAlert>}

        <div className="grid grid-cols-2 gap-3.5">
          <FormField label="Imię" htmlFor="first_name" error={errors.first_name?.message}>
            <Input
              id="first_name"
              autoComplete="given-name"
              placeholder="Katarzyna"
              leadingIcon={<User className="size-4" />}
              invalid={!!errors.first_name}
              {...register('first_name')}
            />
          </FormField>
          <FormField label="Nazwisko" htmlFor="last_name" error={errors.last_name?.message}>
            <Input
              id="last_name"
              autoComplete="family-name"
              placeholder="Nowak"
              leadingIcon={<File className="size-4" />}
              invalid={!!errors.last_name}
              {...register('last_name')}
            />
          </FormField>
        </div>

        <FormField label="E-mail" htmlFor="reg_email" error={errors.email?.message}>
          <Input
            id="reg_email"
            type="email"
            autoComplete="email"
            placeholder="ty@example.com"
            leadingIcon={<Mail className="size-4" />}
            invalid={!!errors.email}
            {...register('email')}
          />
        </FormField>

        <FormField label="Numer telefonu" htmlFor="phone" error={errors.phone?.message}>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+48 600 000 000"
            leadingIcon={<Phone className="size-4" />}
            invalid={!!errors.phone}
            {...register('phone')}
          />
        </FormField>

        <FormField label="Hasło" htmlFor="reg_password" error={errors.password?.message}>
          <PasswordInput
            id="reg_password"
            autoComplete="new-password"
            placeholder="Min. 8 znaków"
            invalid={!!errors.password}
            {...register('password')}
          />
          <PasswordStrengthMeter password={password} />
        </FormField>

        <FormField
          label="Powtórz hasło"
          htmlFor="reg_password_confirm"
          error={errors.password_confirm?.message}
        >
          <PasswordInput
            id="reg_password_confirm"
            autoComplete="new-password"
            placeholder="Wpisz hasło ponownie"
            invalid={!!errors.password_confirm}
            {...register('password_confirm')}
          />
        </FormField>

        <div className="flex flex-col gap-2.5">
          <Checkbox
            {...register('rodo_accepted')}
            label={
              <>
                Wyrażam zgodę na przetwarzanie moich danych osobowych zgodnie z{' '}
                <Link to="/polityka-prywatnosci" className={legalLink}>
                  Polityką prywatności (RODO)
                </Link>
                . {REQUIRED}
              </>
            }
          />
          {errors.rodo_accepted && (
            <p className="text-xs text-danger" role="alert">
              {errors.rodo_accepted.message}
            </p>
          )}
          <Checkbox
            {...register('terms_accepted')}
            label={
              <>
                Akceptuję{' '}
                <Link to="/regulamin" className={legalLink}>
                  Regulamin PsiPark
                </Link>{' '}
                oraz zasady społeczności. {REQUIRED}
              </>
            }
          />
          {errors.terms_accepted && (
            <p className="text-xs text-danger" role="alert">
              {errors.terms_accepted.message}
            </p>
          )}
          <Checkbox
            {...register('marketing_consent')}
            label="Chcę dostawać polecane ogrody i nowości w okolicy (opcjonalnie)."
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={!consentsGiven}
          loading={registerMut.isPending}
          rightIcon={<ArrowRight className="size-4" />}
        >
          Załóż konto
        </Button>

        <SsoButtons />
      </form>

      <footer className="mt-7 border-t border-ink-100 pt-6 text-center text-sm text-ink-700">
        Masz już konto?{' '}
        <Link
          to="/logowanie"
          className="font-semibold text-green-800 transition hover:text-green-700"
        >
          Zaloguj się
        </Link>
      </footer>

      <p className="mx-auto mt-8 max-w-[440px] text-center text-xs leading-relaxed text-ink-500">
        Zakładając konto akceptujesz{' '}
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
        .<br />
        Twoje dane są bezpieczne — używamy szyfrowania SSL.
      </p>
    </>
  );
}

export default RegisterPage;
