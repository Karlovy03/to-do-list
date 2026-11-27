import type { PolicyUser } from '../access';
import { publicUser } from '../users';
import { canChangeTemplate } from './templates.policy';
import type { SearchHit, TemplateRow } from './templates.repository';
import { MATCH_IN } from './templates.search';

export function serializeTemplate(t: TemplateRow, viewer: PolicyUser, hit?: SearchHit) {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    ext: t.ext,
    size: t.size,
    textStatus: t.textStatus,
    createdAt: t.createdAt.toISOString(),
    unit: t.unit ? { id: t.unit.id, name: t.unit.name } : null,
    uploadedBy: t.uploadedBy ? publicUser(t.uploadedBy) : null,
    can: { change: canChangeTemplate(t, viewer) },
    // де знайдено; для збігу в тексті — уривок довкола нього (lead/tail — чи обрізано з країв)
    match: hit ? { in: MATCH_IN[hit.rank] ?? 'content', snippet: hit.snippet, lead: hit.lead, tail: hit.tail } : null,
  };
}

export type TemplateDto = ReturnType<typeof serializeTemplate>;
