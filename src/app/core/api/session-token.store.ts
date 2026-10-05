import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'osoterra.session';

/**
 * Holds the Backend's JWT for the current tab. Session storage keeps a reload signed in
 * without sharing the token across tabs; storage failures (private mode) only cost that.
 */
@Injectable({ providedIn: 'root' })
export class SessionTokenStore {
  private readonly current = signal<string | null>(this.read());
  readonly token = this.current.asReadonly();

  set(token: string): void {
    this.current.set(token);
    try {
      sessionStorage.setItem(STORAGE_KEY, token);
    } catch {
      // Keep the in-memory session only.
    }
  }

  clear(): void {
    this.current.set(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing persisted.
    }
  }

  private read(): string | null {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
