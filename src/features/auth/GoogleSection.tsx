import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useTheme } from '@/shared/ui';
import { GOOGLE_CLIENT_ID } from './config';

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

// Google draws the button in an iframe and takes its width in pixels (at most 400).
const BUTTON_WIDTH = 320;

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
  if (!clientId) return null;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="flex flex-col gap-4" aria-busy={disabled || undefined}>
        <div className="flex items-center gap-3 text-sm text-neutral-700" aria-hidden>
          <span className="h-px flex-1 bg-divider" />
          or
          <span className="h-px flex-1 bg-divider" />
        </div>
        <div className="flex justify-center">
          <GoogleLogin
            text="continue_with"
            shape="pill"
            size="large"
            theme={theme === 'dark' ? 'filled_black' : 'outline'}
            width={BUTTON_WIDTH}
            onSuccess={({ credential }) => (credential ? onCredential(credential) : onFailure())}
            onError={onFailure}
          />
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
