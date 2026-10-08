import { describe, expect, expectTypeOf, it } from 'vitest';
import { fakeServer, type FakeReply, type RecordedRequest } from '@/test/fakeServer';
import { createHttpClient } from './client';
import { createTypedApi, fillPath, type Schema } from './typed';

function apiFor(respond: (request: RecordedRequest) => FakeReply) {
  const server = fakeServer(respond);
  const http = createHttpClient({ baseURL: 'http://api.test/api', adapter: server.adapter });
  return { api: createTypedApi(http), requests: server.requests };
}

describe('fillPath', () => {
  it('drops the /api prefix (the client base URL has it) and fills the placeholders', () => {
    expect(
      fillPath('/api/habits/{habitId}/records/{date}', { habitId: 'abc', date: '2026-10-08' }),
    ).toBe('/habits/abc/records/2026-10-08');
  });

  it('escapes what it fills in', () => {
    expect(fillPath('/api/habits/{id}', { id: 'a/b?c' })).toBe('/habits/a%2Fb%3Fc');
  });

  it('refuses a missing parameter instead of calling a wrong URL', () => {
    expect(() => fillPath('/api/habits/{id}', {})).toThrow('Missing path parameter "id"');
  });

  it('leaves a route without placeholders alone', () => {
    expect(fillPath('/api/habits')).toBe('/habits');
  });
});

describe('the typed client at runtime', () => {
  it('sends query, path and body to the right place and returns the body', async () => {
    const { api, requests } = apiFor(() => ({ status: 200, data: [] }));

    const overview = await api.get('/api/habits/overview', {
      query: { from: '2026-10-01', to: '2026-10-31', asOf: '2026-10-08' },
    });

    expect(overview).toEqual([]);
    expect(requests[0]).toMatchObject({
      method: 'get',
      url: '/habits/overview',
      params: { from: '2026-10-01', to: '2026-10-31', asOf: '2026-10-08' },
    });
  });

  it('answers undefined for 204 No Content', async () => {
    const { api, requests } = apiFor(() => ({ status: 204 }));

    const result = await api.put('/api/daily-diaries/{date}', {
      path: { date: '2026-10-08' },
      body: { mood: 4, grateful: ['tea'] },
    });

    expect(result).toBeUndefined();
    expect(requests[0]).toMatchObject({
      method: 'put',
      url: '/daily-diaries/2026-10-08',
      body: { mood: 4, grateful: ['tea'] },
    });
  });

  it('forwards extra headers (revoke needs a specific access token)', async () => {
    const { api, requests } = apiFor(() => ({ status: 204 }));

    await api.post('/api/auth/revoke', {
      body: { refreshToken: 'r' },
      headers: { Authorization: 'Bearer a' },
    });

    expect(requests[0]?.authorization).toBe('Bearer a');
  });
});

describe('the typed client at compile time', () => {
  // These only have to type-check (`npm run typecheck`); the function is never called.
  it('knows the routes, their parameters, bodies and answers', () => {
    const { api } = apiFor(() => ({ status: 200 }));

    const checks = async () => {
      // The answer type comes from the document: nobody hand-copies a DTO.
      expectTypeOf(await api.get('/api/habits')).toEqualTypeOf<Schema<'HabitListItemDto'>[]>();
      expectTypeOf(await api.get('/api/habits/{id}', { path: { id: 'x' } })).toEqualTypeOf<
        Schema<'HabitDetailsDto'>
      >();
      expectTypeOf(await api.get('/api/habits/overview')).toEqualTypeOf<
        Schema<'HabitOverviewDto'>[]
      >();
      expectTypeOf(
        await api.post('/api/auth/refresh', { body: { refreshToken: 'r' } }),
      ).toEqualTypeOf<Schema<'AuthResult'>>();
      // 204 No Content has no body.
      expectTypeOf(
        await api.delete('/api/habits/{id}', { path: { id: 'x' } }),
      ).toEqualTypeOf<void>();
      // A nullable enum keeps its null (B11): an entry without mood.
      expectTypeOf(
        (await api.get('/api/daily-diaries/{date}', { path: { date: 'd' } })).mood,
      ).toEqualTypeOf<1 | 2 | 3 | 4 | 5 | null>();

      // @ts-expect-error - no such route
      await api.get('/api/nothing');
      // @ts-expect-error - the route exists, but not with this method
      await api.delete('/api/habits');
      // @ts-expect-error - a path parameter is required
      await api.get('/api/habits/{id}');
      // @ts-expect-error - wrong name for the path parameter
      await api.get('/api/habits/{id}', { path: { habitId: 'x' } });
      // @ts-expect-error - a GET has no body
      await api.get('/api/habits', { body: {} });
      // @ts-expect-error - the body must be the route's request type
      await api.post('/api/auth/refresh', { body: { refreshToken: 5 } });
      // @ts-expect-error - unknown query parameter
      await api.get('/api/habits/overview', { query: { month: '2026-10' } });
    };

    expect(checks).toBeTypeOf('function');
  });
});
