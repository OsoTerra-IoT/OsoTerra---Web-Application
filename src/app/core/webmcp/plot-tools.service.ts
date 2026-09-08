import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MonitoringService } from '../data/monitoring.service';
import { AuthService } from '../auth/auth.service';

interface Tool {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute(input: unknown): unknown | Promise<unknown>;
}
interface ModelContext {
  registerTool(tool: Tool, options: { signal: AbortSignal }): void | Promise<void>;
}

/** Optional progressive enhancement. Unsupported browsers use the normal UI. */
@Injectable({ providedIn: 'root' })
export class PlotToolsService {
  private readonly document = inject(DOCUMENT);
  private readonly data = inject(MonitoringService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  register(destroyRef: DestroyRef): void {
    const context = (this.document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    destroyRef.onDestroy(() => lifecycle.abort());
    const tools: Tool[] = [
      {
        name: 'search_osoterra_plots',
        description:
          'Find plots accessible to the current signed-in user. Does not change the page.',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: (input) => {
          const query = this.stringInput(input, 'query').trim().toLowerCase();
          return this.data
            .plots()
            .filter((plot) => plot.name.toLowerCase().includes(query))
            .map((plot) => ({ id: plot.id, name: plot.name }));
        },
      },
      {
        name: 'open_osoterra_plot',
        description:
          'Navigate to an accessible plot detail page. Does not edit monitoring records.',
        inputSchema: {
          type: 'object',
          properties: { plotId: { type: 'string' } },
          required: ['plotId'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async (input) => {
          const id = this.stringInput(input, 'plotId');
          if (!this.data.plots().some((plot) => plot.id === id))
            throw new Error('Plot not accessible');
          if (!(await this.router.navigate(['/app/plots', id])))
            throw new Error('Navigation cancelled');
          return { url: this.router.url };
        },
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() =>
          lifecycle.abort(),
        );
      } catch {
        lifecycle.abort();
      }
    }
  }

  private stringInput(input: unknown, property: string): string {
    if (!this.auth.isAuthenticated()) throw new Error('Sign in required');
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new Error('Invalid input');
    const record = input as Record<string, unknown>;
    if (Object.keys(record).length !== 1 || typeof record[property] !== 'string')
      throw new Error('Invalid input');
    return record[property];
  }
}
