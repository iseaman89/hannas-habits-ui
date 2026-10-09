import { describe, expect, it } from 'vitest';
import {
  NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  loginSchema,
  registerSchema,
} from './credentials';

/** The message for a field, or `undefined` when the input is accepted. */
function loginProblem(input: { email: string; password: string }, field: 'email' | 'password') {
  const result = loginSchema.safeParse(input);
  return result.success ? undefined : result.error.issues.find((i) => i.path[0] === field)?.message;
}

function registerProblem(
  input: { firstName: string; lastName: string; email: string; password: string },
  field: 'firstName' | 'lastName' | 'email' | 'password',
) {
  const result = registerSchema.safeParse(input);
  return result.success ? undefined : result.error.issues.find((i) => i.path[0] === field)?.message;
}

const valid = {
  firstName: 'Hanna',
  lastName: 'Müller',
  email: 'hanna@example.com',
  password: 'Secret-123',
};

describe('loginSchema', () => {
  it('accepts an email and a password', () => {
    expect(loginSchema.parse(valid)).toEqual({
      email: 'hanna@example.com',
      password: 'Secret-123',
    });
  });

  it('asks for both when they are blank', () => {
    expect(loginProblem({ email: '  ', password: '' }, 'email')).toBe('Enter your email address.');
    expect(loginProblem({ email: '  ', password: '' }, 'password')).toBe('Enter your password.');
  });

  it('trims the email but never the password', () => {
    const parsed = loginSchema.parse({ email: '  hanna@example.com ', password: ' pw ' });

    expect(parsed).toEqual({ email: 'hanna@example.com', password: ' pw ' });
  });

  it('does not check the shape of the email (a login must not reveal the rules)', () => {
    expect(loginProblem({ email: 'not-an-email', password: 'x' }, 'email')).toBeUndefined();
  });

  it('stops at the lengths the server accepts', () => {
    const tooLongEmail = 'a'.repeat(EMAIL_MAX_LENGTH + 1);
    const tooLongPassword = 'a'.repeat(PASSWORD_MAX_LENGTH + 1);

    expect(loginProblem({ email: tooLongEmail, password: 'x' }, 'email')).toMatch(/at most 256/);
    expect(loginProblem({ email: 'a@b.c', password: tooLongPassword }, 'password')).toMatch(
      /at most 128/,
    );
    expect(
      loginProblem(
        { email: 'a'.repeat(EMAIL_MAX_LENGTH), password: 'a'.repeat(PASSWORD_MAX_LENGTH) },
        'email',
      ),
    ).toBeUndefined();
  });
});

describe('registerSchema', () => {
  it('accepts a complete form', () => {
    expect(registerSchema.parse(valid)).toEqual(valid);
  });

  it.each(['firstName', 'lastName'] as const)('lets the %s stay empty and trims it', (field) => {
    expect(registerProblem({ ...valid, [field]: '' }, field)).toBeUndefined();
    expect(registerSchema.parse({ ...valid, [field]: '  Hanna  ' })[field]).toBe('Hanna');
  });

  it.each(['firstName', 'lastName'] as const)('limits the %s to 100 characters', (field) => {
    const exactly = 'n'.repeat(NAME_MAX_LENGTH);

    expect(registerProblem({ ...valid, [field]: exactly }, field)).toBeUndefined();
    expect(registerProblem({ ...valid, [field]: exactly + 'n' }, field)).toMatch(/at most 100/);
  });

  it.each(['hanna', 'hanna@', '@example.com', 'ha nna@example.com', 'a@b@c'])(
    'rejects "%s" as an email address',
    (email) => {
      expect(registerProblem({ ...valid, email }, 'email')).toBe('Enter a valid email address.');
    },
  );

  it.each(['hanna@example.com', 'a@b', 'first.last+tag@sub.example.org'])(
    'accepts "%s" as an email address',
    (email) => {
      expect(registerProblem({ ...valid, email }, 'email')).toBeUndefined();
    },
  );

  it('asks for the email before it judges its shape', () => {
    expect(registerProblem({ ...valid, email: ' ' }, 'email')).toBe('Enter your email address.');
  });

  it('does not copy the password policy: that is the server’s to judge', () => {
    expect(registerProblem({ ...valid, password: 'a' }, 'password')).toBeUndefined();
  });
});
