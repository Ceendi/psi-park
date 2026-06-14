import { z } from 'zod';

/**
 * Zod schemas for the auth forms (PLAN §6.5, F1). All messages are Polish (UI
 * language); the backend is the source of truth for deeper rules and its 400s are
 * mapped onto fields by `applyApiErrors`.
 */

const email = z.string().min(1, 'Podaj adres e-mail.').email('Podaj poprawny adres e-mail.');

// Polish mobile number: 9 digits, optional +48 — mirrors the backend validator
// (apps/accounts/validators.py); spaces and dashes are stripped before matching.
const PL_PHONE = /^(?:\+48)?\d{9}$/;
const requiredConsent = (message: string) => z.boolean().refine((v) => v === true, { message });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Podaj hasło.'),
  remember: z.boolean(),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    role: z.enum(['client', 'host']),
    first_name: z.string().min(1, 'Podaj imię.').max(60, 'Imię jest za długie.'),
    last_name: z.string().min(1, 'Podaj nazwisko.').max(60, 'Nazwisko jest za długie.'),
    email,
    phone: z
      .string()
      .min(1, 'Podaj numer telefonu.')
      .refine(
        (v) => PL_PHONE.test(v.replace(/[\s-]/g, '')),
        'Podaj poprawny numer: 9 cyfr, opcjonalnie z prefiksem +48.',
      ),
    password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków.'),
    password_confirm: z.string().min(1, 'Powtórz hasło.'),
    // Two separate required consents on screen (Claude Design) collapse to the
    // backend's single `terms_accepted` flag (PLAN §7.1) — see README decisions.
    rodo_accepted: requiredConsent('Zgoda na przetwarzanie danych jest wymagana.'),
    terms_accepted: requiredConsent('Akceptacja Regulaminu jest wymagana.'),
    marketing_consent: z.boolean(),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: 'Hasła nie są takie same.',
    path: ['password_confirm'],
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const resetRequestSchema = z.object({ email });
export type ResetRequestValues = z.infer<typeof resetRequestSchema>;

export const resetConfirmSchema = z
  .object({
    new_password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków.'),
    new_password_confirm: z.string().min(1, 'Powtórz hasło.'),
  })
  .refine((d) => d.new_password === d.new_password_confirm, {
    message: 'Hasła nie są takie same.',
    path: ['new_password_confirm'],
  });
export type ResetConfirmValues = z.infer<typeof resetConfirmSchema>;
