import { UserRole } from '../models';
export interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  roles: readonly UserRole[];
}
const both: readonly UserRole[] = ['Farmer', 'Advisor'];
export const NAVIGATION: readonly NavigationItem[] = [
  { path: 'home', label: 'nav.home', icon: 'space_dashboard', roles: both },
  { path: 'plots', label: 'nav.plots', icon: 'landscape', roles: both },
  { path: 'alerts', label: 'nav.alerts', icon: 'notifications_none', roles: both },
  { path: 'devices', label: 'nav.devices', icon: 'sensors', roles: ['Farmer'] },
  { path: 'my-advisor', label: 'nav.myAdvisor', icon: 'support_agent', roles: ['Farmer'] },
  { path: 'advisor/compare', label: 'nav.compare', icon: 'compare_arrows', roles: ['Advisor'] },
  { path: 'advisor/reports', label: 'nav.reports', icon: 'description', roles: ['Advisor'] },
  { path: 'advisor/clients', label: 'nav.clients', icon: 'groups', roles: ['Advisor'] },
  { path: 'advisor/calibration', label: 'nav.calibration', icon: 'tune', roles: ['Advisor'] },
  { path: 'subscription', label: 'nav.subscription', icon: 'credit_card', roles: both },
  { path: 'settings', label: 'nav.settings', icon: 'settings', roles: both },
];
