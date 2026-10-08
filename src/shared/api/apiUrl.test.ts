import { describe, expect, it } from 'vitest';
import { apiUrlProblem } from './apiUrl';

describe('apiUrlProblem', () => {
  it.each([
    'http://localhost:8080/api',
    'https://localhost:7054/api',
    'https://api.example.com/api/',
    '/api',
    '  https://localhost:7054/api  ',
  ])('accepts %s', (value) => {
    expect(apiUrlProblem(value)).toBeNull();
  });

  it.each([undefined, '', '   '])('says it is not set when the value is %j', (value) => {
    expect(apiUrlProblem(value)).toMatch(/not set/);
  });

  // The usual slips: no scheme (`new URL` reads "localhost:" as one), another scheme, no URL at
  // all, and `//host` (a path that would leave for another host without saying which protocol).
  it.each(['localhost:7054/api', 'ftp://example.com/api', 'api', '//example.com/api'])(
    'rejects %s and quotes it',
    (value) => {
      expect(apiUrlProblem(value)).toContain(`“${value}”`);
    },
  );
});
