import { API_BASE_URL, createHttpClient, createTypedApi } from '@/shared/api';

/**
 * The client for the auth endpoints (login, register, Google, refresh, revoke): no token logic of
 * its own. A 401 from these calls means "wrong password" or "this token is not valid" and must
 * not start a token renewal.
 */
export const authApi = createTypedApi(createHttpClient({ baseURL: API_BASE_URL }));
