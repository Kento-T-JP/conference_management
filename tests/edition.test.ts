import { describe, expect, it } from 'vitest';
import { editionCardTitle, editionDisplayName, editionPeriodLabel } from '../src/shared/edition';

describe('開催回の表示名', () => {
  it('通常の年次学会は従来どおり略称と年だけを表示する', () => {
    expect(editionDisplayName({ acronym: 'IEEE CVPR', year: 2027, conference_type: '国際会議', start_date: '2027-06-15' })).toBe('IEEE CVPR 2027');
  });

  it('研究会は開催回名を優先して区別する', () => {
    const edition = { acronym: 'MSS', year: 2026, conference_type: '研究会', edition_name: '11月研究会', start_date: '2026-11-12' };
    expect(editionPeriodLabel(edition)).toBe('2026年11月研究会');
    expect(editionDisplayName(edition)).toBe('MSS 2026年11月研究会');
    expect(editionCardTitle(edition)).toBe('11月研究会');
  });

  it('研究会名が未入力でも開催月から見分けられる', () => {
    expect(editionDisplayName({ acronym: 'MSS', year: 2026, conference_type: '研究会', start_date: '2026-06-11' })).toBe('MSS 2026年6月開催');
  });
});
