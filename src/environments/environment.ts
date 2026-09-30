/**
 * Default build: the Web App talks to the in-browser fake API, which implements the same
 * `/api/v1` contract as the OsoSense Backend with demo data. GitHub Pages uses this build.
 */
export const environment = {
  apiUrl: 'http://localhost:8080/api/v1',
  useFakeApi: true,
  fakeApiLatencyMs: 250,
};
