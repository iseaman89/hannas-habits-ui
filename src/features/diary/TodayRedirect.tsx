import { Navigate } from 'react-router-dom';
import { toApiDate } from '@/shared/lib/dates';

/** `/` is the diary of the client's today (never the server's: the day can differ by the time zone). */
export function TodayRedirect() {
  return <Navigate to={`/diary/${toApiDate(new Date())}`} replace />;
}
