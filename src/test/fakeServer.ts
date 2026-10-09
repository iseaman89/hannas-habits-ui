import { AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios';

/** What a test sees of a request that reached the (fake) network. */
export interface RecordedRequest {
  method: string;
  /** As given to the client, relative to its base URL: `/habits/overview`. */
  url: string;
  /** The `Authorization` header, if any. */
  authorization: string | null;
  /** The parsed JSON body, if there was one. */
  body: unknown;
  params: unknown;
}

export type FakeReply = { status: number; data?: unknown } | 'network-error';

/**
 * A stand-in for the network: plug `adapter` into `createHttpClient`, decide what the "server"
 * answers per request, read what was sent from `requests`. No mocking library: it is a plain
 * function that behaves like axios' real transport (non-2xx rejects with an AxiosError).
 */
export function fakeServer(respond: (request: RecordedRequest) => FakeReply | Promise<FakeReply>) {
  const requests: RecordedRequest[] = [];

  const adapter: AxiosAdapter = async (config) => {
    const authorization = config.headers.get('Authorization');
    const request: RecordedRequest = {
      method: (config.method ?? 'get').toLowerCase(),
      url: config.url ?? '',
      authorization: typeof authorization === 'string' ? authorization : null,
      body: typeof config.data === 'string' ? (JSON.parse(config.data) as unknown) : config.data,
      params: config.params as unknown,
    };
    requests.push(request);

    const reply = await respond(request);
    if (reply === 'network-error') {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
    }

    const response: AxiosResponse = {
      data: reply.data ?? '',
      status: reply.status,
      statusText: String(reply.status),
      headers: {},
      config,
    };
    if (reply.status >= 200 && reply.status < 300) return response;
    throw new AxiosError(
      `Request failed with status code ${reply.status}`,
      reply.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      response,
    );
  };

  return { adapter, requests };
}
