/**
 * `local-api` configuration: every call goes to a Backend running on this machine
 * (`ng serve --configuration local-api`).
 */
export const environment = {
  apiUrl: 'http://localhost:8080/api/v1',
  useFakeApi: false,
  fakeApiLatencyMs: 0,
  /** Interview demo mode with numbered scenarios; `?demo=1` turns it on for one tab too. */
  demoMode: false,
};
