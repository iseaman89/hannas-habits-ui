import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useElementWidth } from '@/shared/lib/useElementWidth';
import { useTheme } from '@/shared/ui';
import { GOOGLE_CLIENT_ID } from './config';
import { googleButtonWidth } from './googleButtonWidth';

export interface GoogleSectionProps {
  /** Google's answer: the ID token that the backend verifies. */
  onCredential: (idToken: string) => void;
  /** The Google dialog failed or was not completed. */
  onFailure: () => void;
  /** Another sign-in is under way: a credential that arrives now is ignored by the caller. */
  disabled?: boolean;
  /** The app's configured client id; passed in only by tests. */
  clientId?: string | null;
}

/**
 * The divider and "Continue with Google". Uses Google's own button (the ID-token flow, which is
 * what the backend verifies) instead of a styled `<button>`: a custom button would need
 * `useGoogleLogin`, whose popup flow hands over an *access* token and no `credential` at all.
 * Google's button can be shaped (pill) and themed (light/dark) but not restyled further.
 *
 * Renders nothing when no client id is configured.
 */
export function GoogleSection({
  onCredential,
  onFailure,
  disabled,
  clientId = GOOGLE_CLIENT_ID,
}: GoogleSectionProps) {
  const { theme } = useTheme();
  const [slot, slotWidth] = useElementWidth<HTMLDivElement>();
  if (!clientId) return null;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="flex flex-col gap-4" aria-busy={disabled || undefined}>
        <div className="flex items-center gap-3 text-sm text-neutral-700" aria-hidden>
          <span className="h-px flex-1 bg-divider" />
          or
          <span className="h-px flex-1 bg-divider" />
        </div>
        <div ref={slot} className="flex justify-center">
          <GoogleLogin
            text="continue_with"
            shape="pill"
            size="large"
            theme={theme === 'dark' ? 'filled_black' : 'outline'}
            width={googleButtonWidth(slotWidth)}
            onSuccess={({ credential }) => (credential ? onCredential(credential) : onFailure())}
            onError={onFailure}
          />
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
