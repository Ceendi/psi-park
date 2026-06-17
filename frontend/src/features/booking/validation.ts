import { z } from 'zod';

/**
 * Billing form schema (PLAN §7.5 / Payment.html). The address block is required
 * (it bills the invoice, B6); company name + NIP are the optional
 * "faktura na firmę" extension. Messages are Polish.
 */
export const billingSchema = z.object({
  billing_name: z.string().min(1, 'Podaj imię i nazwisko.').max(120, 'Za długie.'),
  billing_email: z.string().min(1, 'Podaj e-mail.').email('Podaj poprawny e-mail.'),
  billing_address: z.string().min(1, 'Podaj adres.').max(200, 'Za długi.'),
  billing_postal_code: z.string().min(1, 'Podaj kod pocztowy.').max(12, 'Za długi.'),
  billing_city: z.string().min(1, 'Podaj miasto.').max(80, 'Za długie.'),
  billing_country: z.string().min(2, 'Podaj kraj.').max(2),
  company: z.boolean(),
  billing_company: z.string().max(160, 'Za długa.'),
  tax_id: z.string().max(15, 'Za długi.'),
});

export type BillingValues = z.infer<typeof billingSchema>;

export const EMPTY_BILLING: BillingValues = {
  billing_name: '',
  billing_email: '',
  billing_address: '',
  billing_postal_code: '',
  billing_city: '',
  billing_country: 'PL',
  company: false,
  billing_company: '',
  tax_id: '',
};
