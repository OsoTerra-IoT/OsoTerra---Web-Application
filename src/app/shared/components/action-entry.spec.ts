import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { LocaleService } from '../../core/i18n/locale.service';
import { CorrectiveAction } from '../../core/models';
import { ActionEntry } from './action-entry';
import en from '../../../../public/i18n/en.json';
import es from '../../../../public/i18n/es.json';

const action = (overrides: Partial<CorrectiveAction>): CorrectiveAction => ({
  id: '1',
  type: 'LEACHING',
  performedAt: '2026-11-08',
  notes: 'Riego de lavado.',
  createdBy: '1',
  ...overrides,
});

describe('ActionEntry', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideTranslateService()] });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', en);
    translate.setTranslation('es', es);
    await TestBed.inject(LocaleService).setLocale('en_US');
  });
  const render = (value: CorrectiveAction, inline = false) => {
    const fixture = TestBed.createComponent(ActionEntry);
    fixture.componentRef.setInput('action', value);
    fixture.componentRef.setInput('inline', inline);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows no tag on an action a person registered and keeps its note as written', () => {
    const root = render(action({}));
    expect(root.querySelector('.auto-tag')).toBeNull();
    expect(root.textContent).toContain('Salt leaching');
    expect(root.textContent).toContain('Riego de lavado.');
  });
  it('tags the automatic wash and translates the note the sensor reported', () => {
    const root = render(action({ automatic: true, notes: 'AUTO_FLUSH 1/3 60s' }));
    expect(root.querySelector('.auto-tag')?.textContent).toContain('Automatic wash');
    expect(root.textContent).toContain('Automatic wash with pump 1/3, 60 s.');
    expect(root.textContent).not.toContain('AUTO_FLUSH');
  });
  it('adds that a person must act when the washes are used up', () => {
    const root = render(action({ automatic: true, notes: 'AUTO_FLUSH 3/3 60s EXHAUSTED' }));
    expect(root.textContent).toContain('Washes used up: a person must act.');
  });
  it('shows the tag and the note in Spanish and on one line in the report', async () => {
    await TestBed.inject(LocaleService).setLocale('es_419');
    const root = render(action({ automatic: true, notes: 'AUTO_FLUSH 2/3 60s' }), true);
    expect(root.querySelector('.auto-tag')?.textContent).toContain('Lavado automático');
    expect(root.querySelectorAll('p')).toHaveLength(1);
    expect(root.textContent).toContain('Lavado automático con bomba 2/3, 60 s.');
  });
});
