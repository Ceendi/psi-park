import { z } from 'zod';

/** Account-settings form schemas (PLAN F5 — PATCH /me/, /me/password/). */

const PL_PHONE = /^(?:\+48)?\d{9}$/;

export const profileSchema = z.object({
  first_name: z.string().min(1, 'Podaj imię.').max(60, 'Imię jest za długie.'),
  last_name: z.string().min(1, 'Podaj nazwisko.').max(60, 'Nazwisko jest za długie.'),
  phone: z
    .string()
    .refine(
      (v) => v === '' || PL_PHONE.test(v.replace(/[\s-]/g, '')),
      'Podaj poprawny numer: 9 cyfr, opcjonalnie z prefiksem +48.',
    ),
  marketing_consent: z.boolean(),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const passwordSchema = z
  .object({
    old_password: z.string().min(1, 'Podaj obecne hasło.'),
    new_password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków.'),
    new_password_confirm: z.string().min(1, 'Powtórz nowe hasło.'),
  })
  .refine((d) => d.new_password === d.new_password_confirm, {
    message: 'Hasła nie są takie same.',
    path: ['new_password_confirm'],
  });
export type PasswordValues = z.infer<typeof passwordSchema>;
