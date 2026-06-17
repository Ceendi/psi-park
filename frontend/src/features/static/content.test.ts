import { describe, it, expect } from 'vitest';
import { STATIC_DOCS } from './content';

describe('static legal content', () => {
  it('provides all four required documents', () => {
    expect(Object.keys(STATIC_DOCS).sort()).toEqual([
      'polityka-prywatnosci',
      'pomoc',
      'regulamin',
      'uslugi-elektroniczne',
    ]);
  });

  it('each document has a title and at least one section', () => {
    for (const doc of Object.values(STATIC_DOCS)) {
      expect(doc.title).toBeTruthy();
      expect(doc.sections.length).toBeGreaterThan(0);
    }
  });

  it('carries the pupil-liability disclaimer (PLAN §11)', () => {
    const regulamin = JSON.stringify(STATIC_DOCS.regulamin);
    expect(regulamin).toContain('nie ponosi odpowiedzialności za szkody');
  });
});
