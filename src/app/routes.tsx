import type { RouteObject } from 'react-router-dom';
import { LoginPage, PublicOnly, RequireAuth } from '@/features/auth';
import { CalendarPage } from '@/features/calendar';
import { DiaryPage, TodayRedirect } from '@/features/diary';
import { HabitsPage } from '@/features/habits';
import { ResolutionsPage } from '@/features/resolutions';
import { AppShell } from './AppShell';
import { NotFoundPage } from './NotFoundPage';
import { RouteError } from './RouteError';

/**
 * The route table (DESIGN.md §3). Two layout routes carry the rules: `PublicOnly` for the login
 * page, `RequireAuth` + `AppShell` for everything behind the login. Kept as data, apart from the
 * router that runs it, so a test can run the same table in a memory router.
 */
export const routes: RouteObject[] = [
  {
    element: <PublicOnly />,
    children: [{ path: '/login', element: <LoginPage />, errorElement: <RouteError /> }],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            // A pathless route whose only job is to hold the error page: a screen that crashes
            // is replaced by it *inside* the shell, instead of taking the sidebar down with it.
            errorElement: <RouteError />,
            children: [
              { path: '/', element: <TodayRedirect /> },
              { path: '/diary/:date', element: <DiaryPage /> },
              { path: '/habits', element: <HabitsPage /> },
              { path: '/calendar', element: <CalendarPage /> },
              { path: '/resolutions', element: <ResolutionsPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
];
