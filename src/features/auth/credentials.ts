import { z } from 'zod';

/**
 * What the forms check before they send anything. The numbers mirror `AuthLimits` in the backend;
 * the server stays the authority (it also enforces the password policy, which is deliberately not
 * copied here: its answer arrives under `errors.password` and is shown there), so these checks
 * only save a round trip for the obvious mistakes.
 */
export const EMAIL_MAX_LENGTH = 256;
export const PASSWORD_MAX_LENGTH = 128;
export const DISPLAY_NAME_MAX_LENGTH = 100;

// Same idea as the server's check: something, an @, something. Anything stricter would reject
// addresses the server accepts.
const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+$/;

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .max(EMAIL_MAX_LENGTH, `Use at most ${EMAIL_MAX_LENGTH} characters.`);

// Never trimmed: spaces can be part of a password.
const password = z
  .string()
  .min(1, 'Enter your password.')
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`);

/** No format check on login, like the server: a login must not tell which rule an account failed. */
export const loginSchema = z.object({ email, password });
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  /** Optional; blank is fine (the account then shows the email's local part). */
  displayName: z
    .string()
    .trim()
    .max(DISPLAY_NAME_MAX_LENGTH, `Use at most ${DISPLAY_NAME_MAX_LENGTH} characters.`),
  email: email.regex(EMAIL_SHAPE, 'Enter a valid email address.'),
  password,
});
export type RegisterValues = z.infer<typeof registerSchema>;
