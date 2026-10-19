/**
 * Default build (Vercel, GitHub Pages and `ng serve`): the Web App talks to the OsoSense
 * Backend deployed on Railway.
 */
export const environment = {
  apiUrl: 'https://osoterra-backend-production.up.railway.app/api/v1',
  useFakeApi: false,
  fakeApiLatencyMs: 0,
};
