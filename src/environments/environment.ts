/**
 * Default build (Vercel, GitHub Pages and `ng serve`): the Web App talks to the OsoSense
 * Backend deployed on Render.
 */
export const environment = {
  apiUrl: 'https://ososense-backend.onrender.com/api/v1',
  useFakeApi: false,
  fakeApiLatencyMs: 0,
  /** Interview demo mode with numbered scenarios; `?demo=1` turns it on for one tab too. */
  demoMode: false,
};
