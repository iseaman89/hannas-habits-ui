import { useMutation } from '@tanstack/react-query';
import { useAuth } from './auth-context';
import type { AuthGateway } from './authGateway';

/**
 * The three ways to sign in, each a mutation that hands the server's answer to the session. The
 * screen is left by the `PublicOnly` guard as soon as the session says "authenticated", so
 * nothing here navigates. `busy` lets the screen block a second attempt while one is under way.
 */
export function useAuthentication(gateway: AuthGateway) {
  const { signIn } = useAuth();

  const login = useMutation({ mutationFn: gateway.login, onSuccess: signIn });
  const register = useMutation({ mutationFn: gateway.register, onSuccess: signIn });
  const google = useMutation({ mutationFn: gateway.google, onSuccess: signIn });

  return {
    login,
    register,
    google,
    busy: login.isPending || register.isPending || google.isPending,
  };
}
