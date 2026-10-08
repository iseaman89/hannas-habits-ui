import { describe, expect, it } from 'vitest';
import { ApiError, createHttpClient, createTypedApi } from '@/shared/api';
import { diaryDay } from '@/test/fakeDiary';
import { fakeServer, type FakeReply } from '@/test/fakeServer';
import { createDiaryGateway } from './diaryGateway';
import { emptyDraft, toRequest } from './diaryDraft';

function gatewayFor(
  respond: (request: { method: string; url: string }) => FakeReply | Promise<FakeReply>,
) {
  const server = fakeServer(respond);
  const http = createHttpClient({ baseURL: 'http://api.test/api', adapter: server.adapter });
  return { gateway: createDiaryGateway(createTypedApi(http)), requests: server.requests };
}

describe('loading a day', () => {
  it('reads the document of the date', async () => {
    const document = diaryDay('2026-10-07', { mood: 4, highlight: 'A walk' });
    const { gateway, requests } = gatewayFor(() => ({ status: 200, data: document }));

    await expect(gateway.load('2026-10-07')).resolves.toEqual(document);

    expect(requests[0]).toMatchObject({ method: 'get', url: '/daily-diaries/2026-10-07' });
  });

  it('reads the server’s 404 as "nothing written yet", not as a failure', async () => {
    const { gateway } = gatewayFor(() => ({
      status: 404,
      data: { title: 'Not Found', status: 404 },
    }));

    await expect(gateway.load('2026-10-07')).resolves.toBeNull();
  });

  it('lets every other failure through', async () => {
    const { gateway } = gatewayFor(() => ({ status: 500 }));

    await expect(gateway.load('2026-10-07')).rejects.toBeInstanceOf(ApiError);
    await expect(gateway.load('2026-10-07')).rejects.toMatchObject({ status: 500 });
  });

  it('lets "no network" through', async () => {
    const { gateway } = gatewayFor(() => 'network-error');

    await expect(gateway.load('2026-10-07')).rejects.toMatchObject({ isNetworkError: true });
  });
});

describe('saving a day', () => {
  it('puts the whole document to the date', async () => {
    const { gateway, requests } = gatewayFor(() => ({ status: 204 }));
    const request = toRequest({ ...emptyDraft(), mood: 2, body: 0 });

    await gateway.save('2026-10-07', request);

    expect(requests[0]).toMatchObject({
      method: 'put',
      url: '/daily-diaries/2026-10-07',
      body: {
        mood: 2,
        body: 0,
        mind: null,
        highlight: null,
        grateful: [],
        learned: [],
        tasks: [],
      },
    });
  });

  it('hands the server’s validation complaint on, with the field it names', async () => {
    const { gateway } = gatewayFor(() => ({
      status: 400,
      data: { title: 'Validation', errors: { 'tasks[0].title': ['Too long.'] } },
    }));

    await expect(gateway.save('2026-10-07', toRequest(emptyDraft()))).rejects.toMatchObject({
      status: 400,
      fieldErrors: { 'tasks[0].title': ['Too long.'] },
    });
  });
});

describe('writes of one day', () => {
  /** A server that answers each request only when the test says so. */
  function slowServer() {
    const open: (() => void)[] = [];
    const started: string[] = [];
    const { gateway } = gatewayFor(
      (request) =>
        new Promise<FakeReply>((resolve) => {
          started.push(request.url);
          open.push(() => resolve({ status: 204 }));
        }),
    );
    return {
      gateway,
      started,
      answerOldest: async () => {
        open.shift()?.();
        // Let the answer travel back through the client and start what was queued.
        await new Promise((resolve) => setTimeout(resolve, 0));
      },
    };
  }

  const request = toRequest(emptyDraft());
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('go out one after the other, so an older write cannot land after a newer one', async () => {
    const server = slowServer();

    const first = server.gateway.save('2026-10-07', request);
    const second = server.gateway.save('2026-10-07', request);
    await tick();
    expect(server.started).toHaveLength(1);

    await server.answerOldest();
    expect(server.started).toHaveLength(2);

    await server.answerOldest();
    await Promise.all([first, second]);
  });

  it('do not hold up another day', async () => {
    const server = slowServer();

    void server.gateway.save('2026-10-07', request);
    void server.gateway.save('2026-10-08', request);
    await tick();

    expect(server.started).toEqual(['/daily-diaries/2026-10-07', '/daily-diaries/2026-10-08']);
  });

  it('go on after one of them failed', async () => {
    let call = 0;
    const { gateway, requests } = gatewayFor(() =>
      ++call === 1 ? { status: 500 } : { status: 204 },
    );

    await expect(gateway.save('2026-10-07', request)).rejects.toMatchObject({ status: 500 });
    await expect(gateway.save('2026-10-07', request)).resolves.toBeUndefined();

    expect(requests).toHaveLength(2);
  });
});
