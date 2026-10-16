/**
 * `fake-api` configuration: the in-browser fake API answers the same `/api/v1` contract
 * as the Backend with demo data, for demos without a Backend (`ng serve --configuration fake-api`).
 */
export const environment = {
  apiUrl: 'http://localhost:8080/api/v1',
  useFakeApi: true,
  fakeApiLatencyMs: 250,
};
