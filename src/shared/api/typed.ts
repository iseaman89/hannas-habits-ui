import type { AxiosInstance } from 'axios';
import type { components, paths } from './schema';

/** A DTO of the API by name: `Schema<'HabitOverviewDto'>`. Never hand-copy a DTO. */
export type Schema<K extends keyof components['schemas']> = components['schemas'][K];

type Method = 'get' | 'post' | 'put' | 'delete';

/** The routes of the OpenAPI document that offer method `M`. */
type RoutesWith<M extends Method> = {
  [P in keyof paths]: [NonNullable<paths[P][M]>] extends [never] ? never : P;
}[keyof paths];

type Operation<P extends keyof paths, M extends Method> = NonNullable<paths[P][M]>;

type JsonContent<C> = C extends { 'application/json': infer T } ? T : never;

type PathParams<O> = O extends { parameters: { path?: infer T } } ? Exclude<T, undefined> : never;
type QueryParams<O> = O extends { parameters: { query?: infer T } } ? Exclude<T, undefined> : never;
type RequestBody<O> = O extends { requestBody?: infer R }
  ? R extends { content: infer C }
    ? JsonContent<C>
    : never
  : never;

/** The body of the success answer; `void` for "204 No Content". */
type SuccessBody<O> = O extends { responses: infer R }
  ? {
      [S in Extract<keyof R, 200 | 201 | 204>]: R[S] extends { content: infer C }
        ? JsonContent<C>
        : void;
    }[Extract<keyof R, 200 | 201 | 204>]
  : never;

type PathOption<O> = [PathParams<O>] extends [never] ? { path?: never } : { path: PathParams<O> };
type QueryOption<O> = [QueryParams<O>] extends [never]
  ? { query?: never }
  : { query?: QueryParams<O> };
type BodyOption<O> = [RequestBody<O>] extends [never]
  ? { body?: never }
  : { body?: RequestBody<O> };

export type RequestOptions<O> = PathOption<O> &
  QueryOption<O> &
  BodyOption<O> & { signal?: AbortSignal; headers?: Record<string, string> };

/** The options argument is optional unless something in it is required (a path parameter). */
type Args<O> =
  Partial<RequestOptions<O>> extends RequestOptions<O>
    ? [options?: RequestOptions<O>]
    : [options: RequestOptions<O>];

type Call<M extends Method> = <P extends RoutesWith<M>>(
  path: P,
  ...args: Args<Operation<P, M>>
) => Promise<SuccessBody<Operation<P, M>>>;

/**
 * Calls the API by the routes of the generated OpenAPI document: the route, the path and query
 * parameters, the body and the answer are all checked against `schema.d.ts`, so a renamed route
 * or a changed DTO breaks the build instead of a screen at runtime.
 *
 *     await api.get('/api/habits/{id}', { path: { id } });     // -> HabitDto
 *     await api.put('/api/habits/{id}', { path: { id }, body });  // -> void (204)
 *
 * (This is a cut-down `openapi-fetch` on top of the axios client: ~60 lines, and the axios
 * interceptors stay in charge of the token and the error shape.)
 */
export interface TypedApi {
  get: Call<'get'>;
  post: Call<'post'>;
  put: Call<'put'>;
  delete: Call<'delete'>;
}

interface UntypedOptions {
  path?: Record<string, string | number>;
  query?: object;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/** `/api/habits/{id}` + `{ id }` -> `/habits/abc`. The client's base URL already ends in `/api`. */
export function fillPath(template: string, params: UntypedOptions['path'] = {}): string {
  return template.replace(/^\/api(?=\/)/, '').replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`Missing path parameter "${name}" for ${template}`);
    return encodeURIComponent(String(value));
  });
}

export function createTypedApi(http: AxiosInstance): TypedApi {
  const call =
    (method: Method) =>
    async (template: string, options: UntypedOptions = {}): Promise<unknown> => {
      const response = await http.request({
        method,
        url: fillPath(template, options.path),
        params: options.query,
        data: options.body,
        signal: options.signal,
        headers: options.headers,
      });
      return response.status === 204 ? undefined : (response.data as unknown);
    };

  return {
    get: call('get'),
    post: call('post'),
    put: call('put'),
    delete: call('delete'),
  } as TypedApi;
}
