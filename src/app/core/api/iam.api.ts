import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_CONFIG } from './api-config';
import {
  AdvisoryLinkResource,
  AuthenticatedUserResource,
  PasswordResetAcceptedResource,
  RequestPasswordResetResource,
  ResetPasswordResource,
  SignInResource,
  SignUpResource,
  UserAccountResource,
} from './api.types';

/** Identity and Access Management endpoints. */
@Injectable({ providedIn: 'root' })
export class IamApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_CONFIG).baseUrl;

  signUp(body: SignUpResource) {
    return this.http.post<UserAccountResource>(`${this.url}/auth/signup`, body);
  }
  signIn(body: SignInResource) {
    return this.http.post<AuthenticatedUserResource>(`${this.url}/auth/signin`, body);
  }
  requestPasswordReset(body: RequestPasswordResetResource) {
    return this.http.post<PasswordResetAcceptedResource | null>(
      `${this.url}/auth/password-reset-requests`,
      body,
    );
  }
  resetPassword(body: ResetPasswordResource) {
    return this.http.post<void>(`${this.url}/auth/password-resets`, body);
  }
  currentUser() {
    return this.http.get<UserAccountResource>(`${this.url}/users/me`);
  }
  linkedAccounts() {
    return this.http.get<UserAccountResource[]>(`${this.url}/users/me/linked-accounts`);
  }
  requestAdvisoryLink(farmerId: number) {
    return this.http.post<AdvisoryLinkResource>(`${this.url}/advisory-links`, { farmerId });
  }
  acceptAdvisoryLink(id: number) {
    return this.http.post<AdvisoryLinkResource>(`${this.url}/advisory-links/${id}/acceptance`, {});
  }
  revokeAdvisoryLink(id: number) {
    return this.http.post<AdvisoryLinkResource>(`${this.url}/advisory-links/${id}/revocation`, {});
  }
}
