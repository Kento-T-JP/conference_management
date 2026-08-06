export interface EditionIdentity {
  acronym?: string | null;
  year: number;
  edition_name?: string | null;
  start_date?: string | null;
  conference_type?: string | null;
}

export function editionPeriodLabel(edition: EditionIdentity): string {
  const name = edition.edition_name?.trim();
  if (name) return `${edition.year}年${name}`;

  if (edition.conference_type === '研究会' && edition.start_date) {
    const month = Number(edition.start_date.slice(5, 7));
    if (month >= 1 && month <= 12) return `${edition.year}年${month}月開催`;
  }

  return String(edition.year);
}

export function editionDisplayName(edition: EditionIdentity): string {
  const acronym = edition.acronym?.trim();
  const period = editionPeriodLabel(edition);
  return acronym ? `${acronym} ${period}` : period;
}

export function editionCardTitle(edition: EditionIdentity): string {
  const name = edition.edition_name?.trim();
  if (name) return name;
  if (edition.start_date) {
    const month = Number(edition.start_date.slice(5, 7));
    if (month >= 1 && month <= 12) return `${month}月開催`;
  }
  return '日程未定';
}
