/**
 * `real-api` configuration: every call goes to a running OsoSense Backend
 * (`ng serve --configuration real-api`).
 */
export const environment = {
  apiUrl: 'http://localhost:8080/api/v1',
  useFakeApi: false,
  fakeApiLatencyMs: 0,
};
