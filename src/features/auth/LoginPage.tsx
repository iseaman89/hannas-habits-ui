import { useState, type ComponentType } from 'react';
import { errorMessage } from '@/shared/api';
import { Button, Card, FormMessage, Tag, ThemeSwitch, useTheme } from '@/shared/ui';
import { authGateway, type AuthGateway } from './authGateway';
import { GoogleSection, type GoogleSectionProps } from './GoogleSection';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { useAuthentication } from './useAuthentication';

type Mode = 'login' | 'register';

interface LoginPageProps {
  /** The server calls; the running app's by default. */
  gateway?: AuthGateway;
  /** The Google part of the screen; Google's real button by default. */
  GoogleButton?: ComponentType<GoogleSectionProps>;
}

const GOOGLE_FAILED = 'Google sign-in did not work. Please try again.';

/**
 * Log in / create account on one screen (DESIGN.md §4.1). The screen only collects and sends; once
 * the session starts, the `PublicOnly` guard around the route takes the person to where they
 * were going.
 */
export function LoginPage({ gateway = authGateway, GoogleButton = GoogleSection }: LoginPageProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [googleMessage, setGoogleMessage] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const authentication = useAuthentication(gateway);
  const { busy } = authentication;

  function switchMode() {
    setGoogleMessage(null);
    setMode(mode === 'login' ? 'register' : 'login');
  }

  async function signInWithGoogle(idToken: string) {
    if (busy) return; // Google's button lives in an iframe and cannot be disabled
    setGoogleMessage(null);
    try {
      await authentication.google.mutateAsync(idToken);
    } catch (error) {
      setGoogleMessage(errorMessage(error));
    }
  }

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-2">
      <div className="absolute right-4 top-4 z-10">
        <ThemeSwitch value={theme} onChange={setTheme} />
      </div>

      <section className="relative flex flex-col justify-center gap-5 overflow-hidden px-8 pb-6 pt-20 lg:px-16 lg:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-accent-200"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 right-8 size-64 rounded-full bg-accent-2-200"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-40 left-1/3 size-6 rounded-full bg-accent-2-500"
        />
        <h1 className="relative font-display text-[clamp(3rem,7vw,5.5rem)] leading-[1.05] tracking-tight">
          Hanna&apos;s Habits
        </h1>
        <p className="relative max-w-md text-lg text-neutral-800">
          Daily reflections, habits, and goals in one place.
        </p>
        <ul className="relative flex flex-wrap gap-2">
          <li>
            <Tag tone="accent">Daily diary</Tag>
          </li>
          <li>
            <Tag tone="accent-2">Habits</Tag>
          </li>
          <li>
            <Tag tone="neutral">Resolutions</Tag>
          </li>
        </ul>
      </section>

      <main className="grid place-items-center px-4 pb-10 pt-4 lg:p-8">
        <Card className="flex w-full max-w-md flex-col gap-5 p-8 shadow-md">
          <h2 className="font-display text-dialog">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>

          {mode === 'login' ? (
            <LoginForm onSubmit={authentication.login.mutateAsync} disabled={busy} />
          ) : (
            <RegisterForm onSubmit={authentication.register.mutateAsync} disabled={busy} />
          )}

          <GoogleButton
            onCredential={(idToken) => void signInWithGoogle(idToken)}
            onFailure={() => setGoogleMessage(GOOGLE_FAILED)}
            disabled={busy}
          />
          <FormMessage message={googleMessage} />

          <Button variant="ghost" size="sm" onClick={switchMode} className="self-center">
            {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
          </Button>
        </Card>
      </main>
    </div>
  );
}
