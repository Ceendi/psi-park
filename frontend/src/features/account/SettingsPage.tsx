import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Checkbox, FormField, Input, Modal, useToast } from '@/shared/ui';
import { useAuth } from '@/shared/auth';
import type { UserRole } from '@/shared/api/types';
import { useChangePassword, useDeleteAccount, useUpdateProfile } from './api';
import { applyApiErrors, getApiMessage } from './forms';
import {
  passwordSchema,
  profileSchema,
  type PasswordValues,
  type ProfileValues,
} from './validation';

const ROLE_LABEL: Record<UserRole, string> = {
  client: 'Klient',
  host: 'Gospodarz',
  admin: 'Administrator',
};

function Banner({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-ink">
      {message}
    </p>
  );
}

function ProfileSection() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { first_name: '', last_name: '', phone: '', marketing_consent: false },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone ?? '',
        marketing_consent: user.marketing_consent,
      });
    }
  }, [user, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await updateProfile.mutateAsync(values);
      await refreshUser();
      toast({ variant: 'success', title: 'Zapisano dane' });
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError, ['first_name', 'last_name', 'phone']));
    }
  });

  return (
    <Card>
      <h2 className="text-lg font-semibold tracking-tight">Dane osobowe</h2>
      <p className="mt-1 text-[13px] text-ink-500">
        {user?.email} · {user ? ROLE_LABEL[user.role] : ''}
      </p>
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4" noValidate>
        {formError && <Banner message={formError} />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Imię" htmlFor="set-first" required error={form.formState.errors.first_name?.message}>
            <Input id="set-first" invalid={!!form.formState.errors.first_name} {...form.register('first_name')} />
          </FormField>
          <FormField label="Nazwisko" htmlFor="set-last" required error={form.formState.errors.last_name?.message}>
            <Input id="set-last" invalid={!!form.formState.errors.last_name} {...form.register('last_name')} />
          </FormField>
        </div>
        <FormField label="Telefon" htmlFor="set-phone" error={form.formState.errors.phone?.message}>
          <Input id="set-phone" placeholder="+48 600 100 200" {...form.register('phone')} />
        </FormField>
        <Checkbox label="Chcę otrzymywać informacje marketingowe i newsletter." {...form.register('marketing_consent')} />
        <div className="flex justify-end">
          <Button type="submit" loading={updateProfile.isPending}>
            Zapisz zmiany
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordSection() {
  const { toast } = useToast();
  const changePassword = useChangePassword();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { old_password: '', new_password: '', new_password_confirm: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await changePassword.mutateAsync(values);
      toast({ variant: 'success', title: 'Hasło zmienione' });
      form.reset();
    } catch (error) {
      setFormError(
        applyApiErrors(error, form.setError, ['old_password', 'new_password', 'new_password_confirm']),
      );
    }
  });

  const { errors } = form.formState;

  return (
    <Card>
      <h2 className="text-lg font-semibold tracking-tight">Zmiana hasła</h2>
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4" noValidate>
        {formError && <Banner message={formError} />}
        <FormField label="Obecne hasło" htmlFor="set-oldpass" required error={errors.old_password?.message}>
          <Input id="set-oldpass" type="password" invalid={!!errors.old_password} {...form.register('old_password')} />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Nowe hasło" htmlFor="set-newpass" required error={errors.new_password?.message}>
            <Input id="set-newpass" type="password" invalid={!!errors.new_password} {...form.register('new_password')} />
          </FormField>
          <FormField
            label="Powtórz nowe hasło"
            htmlFor="set-newpass2"
            required
            error={errors.new_password_confirm?.message}
          >
            <Input
              id="set-newpass2"
              type="password"
              invalid={!!errors.new_password_confirm}
              {...form.register('new_password_confirm')}
            />
          </FormField>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={changePassword.isPending}>
            Zmień hasło
          </Button>
        </div>
      </form>
    </Card>
  );
}

function DangerSection() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const deleteAccount = useDeleteAccount();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleLogoutEverywhere() {
    await logout();
    navigate('/');
  }

  async function handleDelete() {
    try {
      await deleteAccount.mutateAsync();
      await logout();
      toast({ variant: 'success', title: 'Konto zostało usunięte' });
      navigate('/');
    } catch (error) {
      toast({ variant: 'error', title: 'Nie udało się usunąć konta', description: getApiMessage(error) });
      setConfirmOpen(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold tracking-tight">Bezpieczeństwo i konto</h2>
      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-ink-900">Wyloguj z bieżącej sesji</div>
            <p className="text-[13px] text-ink-500">Unieważnij token odświeżania na tym urządzeniu.</p>
          </div>
          <Button variant="secondary" onClick={handleLogoutEverywhere}>
            Wyloguj się
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
          <div>
            <div className="text-sm font-semibold text-danger">Usuń konto</div>
            <p className="text-[13px] text-ink-500">
              Trwałe usunięcie konta zgodnie z RODO. Tej operacji nie można cofnąć.
            </p>
          </div>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Usuń konto
          </Button>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Usunąć konto?"
        description="Twoje konto i powiązane dane zostaną trwale usunięte. Tej operacji nie można cofnąć."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Anuluj
            </Button>
            <Button variant="danger" loading={deleteAccount.isPending} onClick={handleDelete}>
              Usuń konto na zawsze
            </Button>
          </>
        }
      />
    </Card>
  );
}

/** Account settings — shared by client & host panels (PLAN §16.2 `/…/ustawienia`). */
export function SettingsPage() {
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[28px] font-bold tracking-tight">Ustawienia konta</h1>
        <p className="mt-1.5 text-sm text-ink-500">Zarządzaj danymi, hasłem i zgodami.</p>
      </div>
      <div className="flex max-w-3xl flex-col gap-5">
        <ProfileSection />
        <PasswordSection />
        <DangerSection />
      </div>
    </div>
  );
}
