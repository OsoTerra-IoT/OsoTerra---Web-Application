import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { IamApi } from '../api/iam.api';
import { provideFakeApiForTests } from '../api/testing';
import { AuthService, DEMO_ACCOUNTS, DEMO_PASSWORD } from '../auth/auth.service';
import { AdvisoryLinkService } from './advisory-link.service';
import { MonitoringService } from './monitoring.service';

describe('AdvisoryLinkService over the IAM API', () => {
  let auth: AuthService;
  let links: AdvisoryLinkService;
  let data: MonitoringService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideFakeApiForTests() });
    auth = TestBed.inject(AuthService);
    links = TestBed.inject(AdvisoryLinkService);
    data = TestBed.inject(MonitoringService);
  });
  const login = (account: keyof typeof DEMO_ACCOUNTS) =>
    auth.login({ email: DEMO_ACCOUNTS[account], password: DEMO_PASSWORD });
  const status = (request: Promise<unknown>) =>
    request.then(
      () => 200,
      (error: { status: number }) => error.status,
    );

  it('lists the pending request a farmer received with the advisor name and email', async () => {
    await login('farmer');
    expect(links.pending()).toHaveLength(1);
    expect(links.pending()[0]).toMatchObject({
      advisorName: 'Lucía Vargas',
      advisorEmail: DEMO_ACCOUNTS.advisor2,
      farmerName: 'Elena Ramos',
    });
    expect(links.accepted().map((link) => link.advisorName)).toEqual(['Diego Torres']);
    auth.logout();
    expect(links.links()).toEqual([]);
  });
  it('maps invitation failures from the API status codes', async () => {
    await login('advisor');
    expect(await links.invite('not-an-email')).toBe('invalid');
    expect(await links.invite('nobody@osoterra.demo')).toBe('notFound');
    expect(await links.invite(DEMO_ACCOUNTS.advisor2)).toBe('conflict');
    expect(await links.invite(DEMO_ACCOUNTS.farmer2)).toBe('linked');
    expect(await links.invite(' Farmer3@OsoTerra.demo ')).toBe('sent');
    expect(links.pending().map((link) => link.farmerName)).toEqual(['Rosa Quispe']);
    expect(await links.invite(DEMO_ACCOUNTS.farmer3)).toBe('linked');
  });
  it('lets the advisor cancel a pending invitation', async () => {
    await login('advisor');
    await links.invite(DEMO_ACCOUNTS.farmer3);
    expect(await links.revoke(links.pending()[0].id)).toBe(true);
    expect(links.pending()).toEqual([]);
    await login('farmer3');
    expect(links.links()).toEqual([]);
  });
  it('adds the farmer to the client roster once they accept, before any plot', async () => {
    await login('advisor');
    await links.invite(DEMO_ACCOUNTS.farmer3);
    expect(data.clients()).toHaveLength(2);
    await login('farmer3');
    expect(await links.accept(links.pending()[0].id)).toBe(true);
    expect(auth.user()).toMatchObject({ role: 'Farmer', advisorId: '3' });
    expect(auth.findUser('3')?.lastName).toBe('Torres');
    await login('advisor');
    const quispe = data.clients().find((client) => client.user?.lastName === 'Quispe');
    expect(quispe).toMatchObject({ plots: [], areaHectares: 0, openAlerts: 0 });
    expect(data.clients()).toHaveLength(3);
  });
  it('lets a farmer decline a request and keep the current advisor', async () => {
    await login('farmer');
    expect(await links.revoke(links.pending()[0].id)).toBe(true);
    expect(links.pending()).toEqual([]);
    expect(auth.user()).toMatchObject({ advisorId: '3' });
    await login('advisor2');
    expect(links.links()).toEqual([]);
  });
  it('removes the farm data of a client whose supervision the advisor ends', async () => {
    await login('advisor');
    const carla = data.clients().find((client) => client.user?.lastName === 'Mendoza')!;
    expect(await links.revoke(links.acceptedWith(carla.id)!.id)).toBe(true);
    expect(auth.linked().map((user) => user.lastName)).toEqual(['Ramos']);
    expect(data.clients().map((client) => client.user?.lastName)).toEqual(['Ramos']);
    expect(data.plots().every((plot) => plot.ownerId !== carla.id)).toBe(true);
    await login('farmer2');
    expect(auth.user()).toMatchObject({ advisorId: undefined });
    expect(links.links()).toEqual([]);
  });
  it('enforces who may accept or revoke a link, as the Backend does', async () => {
    const api = TestBed.inject(IamApi);
    await login('advisor');
    const pendingOfElena = 3;
    expect(await status(firstValueFrom(api.acceptAdvisoryLink(pendingOfElena)))).toBe(403);
    expect(await status(firstValueFrom(api.revokeAdvisoryLink(pendingOfElena)))).toBe(403);
    await login('farmer');
    expect(await status(firstValueFrom(api.acceptAdvisoryLink(1)))).toBe(409);
    expect(await status(firstValueFrom(api.revokeAdvisoryLink(pendingOfElena)))).toBe(200);
    expect(await status(firstValueFrom(api.revokeAdvisoryLink(pendingOfElena)))).toBe(409);
    await login('farmer3');
    expect(await status(firstValueFrom(api.requestAdvisoryLink({ farmerEmail: 'x@y.z' })))).toBe(
      409,
    );
  });
});
