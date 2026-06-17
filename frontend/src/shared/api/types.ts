import type { components } from './schema';

/**
 * Domain type aliases over the generated OpenAPI schema (PLAN §5, §16.3).
 * Features import these clean names instead of reaching into `schema.d.ts`,
 * which stays the single generated source of truth (never edited by hand).
 */
type Schemas = components['schemas'];

/* ----- Accounts / auth ----- */
export type User = Schemas['User'];
export type UserRole = Schemas['RoleEnum'];
export type AuthTokens = Schemas['AuthTokens'];
export type TokenRefresh = Schemas['TokenRefresh'];
export type LoginInput = Schemas['Login'];
export type RegisterInput = Schemas['Register'];
export type RegisterRole = Schemas['RegisterRoleEnum'];
export type PasswordResetRequest = Schemas['PasswordResetRequest'];
export type PasswordResetConfirm = Schemas['PasswordResetConfirm'];

/* ----- Dogs ----- */
export type Dog = Schemas['DogDetail'];
export type DogListItem = Schemas['DogList'];
export type DogWrite = Schemas['DogWrite'];
export type DogMini = Schemas['DogMini'];
export type DogSex = Schemas['SexEnum'];

/* ----- Gardens ----- */
export type Garden = Schemas['GardenDetail'];
export type GardenListItem = Schemas['GardenList'];
export type GardenMini = Schemas['GardenMini'];
export type GardenWrite = Schemas['GardenWrite'];
export type GardenPhoto = Schemas['GardenPhoto'];
export type HostPublic = Schemas['HostPublic'];
export type Amenity = Schemas['AmenitiesEnum'];
export type SurfaceType = Schemas['SurfaceTypeEnum'];
export type VerificationStatus = Schemas['VerificationStatusEnum'];
export type Availability = Schemas['Availability'];
export type Slot = Schemas['Slot'];

/* ----- Reservations ----- */
export type Reservation = Schemas['ReservationDetail'];
export type ReservationListItem = Schemas['ReservationList'];
export type ReservationCreate = Schemas['ReservationCreate'];
export type ReservationStatus = Schemas['StatusEnum'];
export type CancelResult = Schemas['CancelResult'];
export type ScheduleEvent = Schemas['ScheduleEvent'];
export type HostStats = Schemas['HostStats'];

/** Panel-tab grouping accepted by `GET /reservations/?status_group=` (PLAN §8.2). */
export type ReservationStatusGroup = 'upcoming' | 'completed' | 'cancelled';

/* ----- Reviews ----- */
export type Review = Schemas['Review'];
export type ReviewWrite = Schemas['ReviewWrite'];
export type ReviewAuthor = Schemas['ReviewAuthor'];
export type EligibleReservation = Schemas['EligibleReservation'];

/* ----- Invoices ----- */
export type Billing = Schemas['Billing'];
export type PaymentIntentResponse = Schemas['PaymentIntentResponse'];
export type StripeConfig = Schemas['StripeConfig'];
export type Invoice = Schemas['Invoice'];

/* ----- Account (me) ----- */
export type MeUpdate = Schemas['PatchedMeUpdate'];
export type PasswordChange = Schemas['PatchedPasswordChange'];

/**
 * Health-document status the backend serializes for a dog
 * (`health_status` / `vaccinations_status` / `deworming_status`, PLAN §7.2).
 * The API returns plain strings; this narrows them for the UI colour mapping.
 */
export type DogHealthStatus = 'valid' | 'expiring_soon' | 'expired' | 'unknown';

/* ----- System ----- */
export type HealthResponse = Schemas['HealthResponse'];

/** Page envelope for any paginated list (PLAN §8.1). */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Error response shapes the frontend handles (PLAN §6.3):
 *  - business / generic: `{ detail, code }`
 *  - field validation (DRF 400): `{ field: ["message", …] }`
 */
export interface ApiErrorBody {
  detail?: string;
  code?: string;
  [field: string]: string | string[] | undefined;
}
