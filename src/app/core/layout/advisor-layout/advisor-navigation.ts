import { NavigationItem } from '../navigation';

/** Advisor sidebar. Farmer-only destinations are deliberately absent. */
export const ADVISOR_NAVIGATION: readonly Omit<NavigationItem, 'roles'>[] = [
  { path: 'home', label: 'nav.home', icon: 'space_dashboard' },
  { path: 'plots', label: 'nav.supervisedPlots', icon: 'landscape' },
  { path: 'alerts', label: 'nav.alerts', icon: 'notifications_none' },
  { path: 'advisor/compare', label: 'nav.compare', icon: 'compare_arrows' },
  { path: 'advisor/clients', label: 'nav.clients', icon: 'groups' },
  { path: 'advisor/calibration', label: 'nav.calibration', icon: 'tune' },
  { path: 'advisor/reports', label: 'nav.reports', icon: 'description' },
  { path: 'subscription', label: 'nav.subscription', icon: 'credit_card' },
  { path: 'settings', label: 'nav.settings', icon: 'settings' },
];