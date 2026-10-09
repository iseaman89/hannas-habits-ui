import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api';
import { ThemeProvider, ToastProvider } from '@/shared/ui';
import { fakeSession, signedOut } from '@/test/fakeSession';
import { AuthProvider } from './AuthProvider';
import type { AuthGateway } from './authGateway';
import { LoginPage } from './LoginPage';
import type { AuthResult } from './session';
import type { GoogleSectionProps } from './GoogleSection';

const authResult: AuthResult = {
  user: {
    id: 'u-1',
    userName: 'hanna@example.com',
    email: 'hanna@example.com',
    firstName: 'Hanna',
    lastName: null,
  },
  tokens: {
    accessToken: 'a1',
    refreshToken: 'r1',
    accessTokenExpiresAt: '2026-10-08T12:15:00Z',
    refreshTokenExpiresAt: '2026-11-07T12:00:00Z',
  },
};

function problem(
  status: number,
  body: { title?: string; detail?: string; fieldErrors?: Record<string, string[]> } = {},
) {
  return new ApiError(status, {
    title: body.title ?? null,
    detail: body.detail ?? null,
    fieldErrors: body.fieldErrors ?? {},
  });
}

/** A promise the test settles by hand, to look at the screen while a request is under way. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A gateway that answers with whatever `state.answer` makes (a success by default) and remembers the calls. */
function fakeGateway() {
  const calls = {
    login: [] as Parameters<AuthGateway['login']>[0][],
    register: [] as Parameters<AuthGateway['register']>[0][],
    google: [] as string[],
  };
  // A function, not a promise: a rejected promise made in advance would count as unhandled until
  // the gateway is called.
  const state: { answer: () => Promise<AuthResult> } = {
    answer: () => Promise.resolve(authResult),
  };

  const gateway: AuthGateway = {
    login: (credentials) => {
      calls.login.push(credentials);
      return state.answer();
    },
    register: (account) => {
      calls.register.push(account);
      return state.answer();
    },
    google: (idToken) => {
      calls.google.push(idToken);
      return state.answer();
    },
  };
  return { gateway, calls, state };
}

/** Google's real button is an iframe; this one reports a credential or a failure on click. */
function FakeGoogleButton({ onCredential, onFailure }: GoogleSectionProps) {
  return (
    <>
      <button type="button" onClick={() => onCredential('google-id-token')}>
        Continue with Google
      </button>
      <button type="button" onClick={onFailure}>
        Google fails
      </button>
    </>
  );
}

function setup() {
  const server = fakeGateway();
  const session = fakeSession(signedOut);
  const user = userEvent.setup();
  render(
    <ThemeProvider>
      <QueryClientProvider client={new QueryClient()}>
        <ToastProvider>
          <AuthProvider session={session}>
            <LoginPage gateway={server.gateway} GoogleButton={FakeGoogleButton} />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
  return { ...server, session, user };
}

const emailField = () => screen.getByLabelText('Email');
const passwordField = () => screen.getByLabelText('Password');

async function fillLogin(user: ReturnType<typeof userEvent.setup>, email = 'hanna@example.com') {
  await user.type(emailField(), email);
  await user.type(passwordField(), 'Secret-123');
}

describe('LoginPage: log in', () => {
  it('starts with the login form', () => {
    setup();

    expect(screen.getByRole('heading', { level: 1, name: "Hanna's Habits" })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByLabelText('First name')).not.toBeInTheDocument();
  });

  it('asks for what is missing and sends nothing', async () => {
    const { user, calls } = setup();

    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(emailField()).toBeInvalid();
    expect(calls.login).toEqual([]);
  });

  it('sends the trimmed email and the password, then starts the session with the answer', async () => {
    const { user, calls, session } = setup();

    await fillLogin(user, '  hanna@example.com ');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(session.started).toEqual([authResult]));
    expect(calls.login).toEqual([{ email: 'hanna@example.com', password: 'Secret-123' }]);
  });

  it('leaves judging the email to the server: a login does not check its shape', async () => {
    const { user, calls } = setup();

    await user.type(emailField(), 'hanna');
    await user.type(passwordField(), 'Secret-123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(calls.login).toEqual([{ email: 'hanna', password: 'Secret-123' }]));
  });

  it('submits with Enter', async () => {
    const { user, calls } = setup();

    await fillLogin(user);
    await user.keyboard('{Enter}');

    await waitFor(() => expect(calls.login).toHaveLength(1));
  });

  it('shows a busy button while the request is under way, and sends it only once', async () => {
    const { user, calls, state, session } = setup();
    const pending = deferred<AuthResult>();
    state.answer = () => pending.promise;

    await fillLogin(user);
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    const button = await screen.findByRole('button', { name: 'Log in' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await user.click(button);
    expect(calls.login).toHaveLength(1);

    pending.resolve(authResult);
    await waitFor(() => expect(session.started).toHaveLength(1));
  });

  it('says so in words when the credentials are wrong, and keeps what was typed', async () => {
    const { user, state, session } = setup();
    state.answer = () =>
      Promise.reject(
        problem(401, {
          title: 'Authentication failed.',
          detail: 'The email or password is incorrect.',
        }),
      );

    await fillLogin(user);
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The email or password is incorrect.',
    );
    expect(emailField()).toHaveValue('hanna@example.com');
    expect(passwordField()).toHaveValue('Secret-123');
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
    expect(session.started).toEqual([]);
  });

  it('tells a locked-out person why', async () => {
    const { user, state } = setup();
    state.answer = () =>
      Promise.reject(
        problem(429, {
          title: 'Too many failed sign-in attempts.',
          detail: 'Try again in 15 minutes.',
        }),
      );

    await fillLogin(user);
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Try again in 15 minutes.');
  });

  it('says when the server cannot be reached', async () => {
    const { user, state } = setup();
    state.answer = () => Promise.reject(problem(0));

    await fillLogin(user);
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot be reached/);
  });

  it('puts a complaint of the server under its field', async () => {
    const { user, state } = setup();
    state.answer = () =>
      Promise.reject(problem(400, { fieldErrors: { email: ['The Email field is too long.'] } }));

    await fillLogin(user);
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('The Email field is too long.')).toBeInTheDocument();
    expect(emailField()).toBeInvalid();
    expect(emailField()).toHaveFocus();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('forgets an old complaint when the next attempt is made', async () => {
    const { user, state, session } = setup();
    state.answer = () =>
      Promise.reject(problem(401, { detail: 'The email or password is incorrect.' }));
    await fillLogin(user);
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    await screen.findByRole('alert');

    state.answer = () => Promise.resolve(authResult);
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(session.started).toHaveLength(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('LoginPage: create an account', () => {
  async function openRegister(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'New here? Create an account' }));
  }

  it('switches to the registration form and back, on the same button', async () => {
    const { user } = setup();
    const toggle = screen.getByRole('button', { name: 'New here? Create an account' });

    await user.click(toggle);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Create your account' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('First name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    // The same element stays (and keeps the focus), so a keyboard user is not thrown out.
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveTextContent('Already have an account? Log in');

    await user.click(toggle);

    expect(screen.getByRole('heading', { level: 2, name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByLabelText('First name')).not.toBeInTheDocument();
  });

  it('names the mode in the browser tab', async () => {
    const { user } = setup();
    expect(document.title).toBe("Log in · Hanna's Habits");

    await openRegister(user);

    expect(document.title).toBe("Create account · Hanna's Habits");
  });

  it('checks the shape of the email, which a login does not', async () => {
    const { user, calls } = setup();
    await openRegister(user);

    await user.type(emailField(), 'hanna');
    await user.type(passwordField(), 'Secret-123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(calls.register).toEqual([]);
  });

  it('sends the names, email and password, then starts the session', async () => {
    const { user, calls, session } = setup();
    await openRegister(user);

    await user.type(screen.getByLabelText('First name'), '  Hanna ');
    await user.type(screen.getByLabelText('Last name'), ' Müller ');
    await user.type(emailField(), 'hanna@example.com');
    await user.type(passwordField(), 'Secret-123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(session.started).toEqual([authResult]));
    expect(calls.register).toEqual([
      {
        firstName: 'Hanna',
        lastName: 'Müller',
        email: 'hanna@example.com',
        password: 'Secret-123',
      },
    ]);
  });

  it('lets the names stay empty', async () => {
    const { user, calls } = setup();
    await openRegister(user);

    await user.type(emailField(), 'hanna@example.com');
    await user.type(passwordField(), 'Secret-123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(calls.register).toHaveLength(1));
    expect(calls.register[0]).toMatchObject({ firstName: '', lastName: '' });
  });

  it('shows the password rules of the server under the password field', async () => {
    const { user, state } = setup();
    state.answer = () =>
      Promise.reject(
        problem(400, {
          fieldErrors: {
            password: [
              'Passwords must have at least one digit (0-9).',
              'Passwords must have at least one uppercase (A-Z).',
            ],
          },
        }),
      );
    await openRegister(user);

    await user.type(emailField(), 'hanna@example.com');
    await user.type(passwordField(), 'secret');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    // One rule per line, not four sentences in a row (Testing Library's text queries and
    // jest-dom fold line breaks into spaces, so the raw text is compared here).
    const rules = await screen.findByText(
      'Passwords must have at least one digit (0-9). Passwords must have at least one uppercase (A-Z).',
    );
    expect(rules.textContent).toBe(
      'Passwords must have at least one digit (0-9).\nPasswords must have at least one uppercase (A-Z).',
    );
    expect(passwordField()).toBeInvalid();
    expect(passwordField()).toHaveFocus();
  });

  it('shows "email already in use" under the email field', async () => {
    const { user, state } = setup();
    state.answer = () =>
      Promise.reject(
        problem(409, {
          title: 'The request conflicts with the current state.',
          detail: 'The email address is already in use.',
        }),
      );
    await openRegister(user);

    await user.type(emailField(), 'hanna@example.com');
    await user.type(passwordField(), 'Secret-123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('The email address is already in use.')).toBeInTheDocument();
    expect(emailField()).toBeInvalid();
    expect(emailField()).toHaveFocus();
  });
});

describe('LoginPage: Google', () => {
  it('sends the ID token Google hands over and starts the session', async () => {
    const { user, calls, session } = setup();

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => expect(session.started).toEqual([authResult]));
    expect(calls.google).toEqual(['google-id-token']);
  });

  it('works from the registration form as well', async () => {
    const { user, calls } = setup();
    await user.click(screen.getByRole('button', { name: 'New here? Create an account' }));

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => expect(calls.google).toHaveLength(1));
  });

  it('says so when Google did not deliver a credential', async () => {
    const { user, calls } = setup();

    await user.click(screen.getByRole('button', { name: 'Google fails' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Google sign-in did not work. Please try again.',
    );
    expect(calls.google).toEqual([]);
  });

  it('shows the server’s reason, e.g. that a password account owns the email', async () => {
    const { user, state } = setup();
    state.answer = () =>
      Promise.reject(
        problem(409, {
          detail:
            'An account with this email address already exists. Sign in with your password instead.',
        }),
      );

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sign in with your password instead.',
    );
  });

  it('ignores a second credential while the first is being checked', async () => {
    const { user, calls, state, session } = setup();
    const pending = deferred<AuthResult>();
    state.answer = () => pending.promise;

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(calls.google).toHaveLength(1);
    pending.resolve(authResult);
    await waitFor(() => expect(session.started).toHaveLength(1));
  });

  it('blocks the password form while Google is being checked', async () => {
    const { user, state } = setup();
    const never = deferred<AuthResult>();
    state.answer = () => never.promise;

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Log in' })).toBeDisabled());
  });

  it('clears the Google message when the person switches to the other form', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Google fails' }));
    await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: 'New here? Create an account' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
