export type UserRole = 'Farmer' | 'Advisor';
export type AppLocale = 'en_US' | 'es_419';

interface UserBase {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  province: string;
  locale: AppLocale;
  termsAcceptedAt: string;
}

export type User = UserBase &
  ({ role: 'Farmer'; advisorId?: string } | { role: 'Advisor'; cipNumber: string });

export interface LoginCredentials {
  email: string;
  password: string;
}
export interface RegistrationRequest extends LoginCredentials {
  firstName: string;
  lastName: string;
  department: string;
  province: string;
  role: UserRole;
  cipNumber?: string;
  acceptsTerms: boolean;
}
