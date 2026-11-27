import type { Prisma, TemplateTextStatus } from '@prisma/client';
import { prisma } from '../../core/prisma';
import { likePattern, SNIPPET_AROUND } from './templates.search';

export const templateInclude = { unit: true, uploadedBy: true } satisfies Prisma.TemplateInclude;
/** Великі поля не тягнемо в списки: текст лише для уривків і перерахунку searchText */
const light = { content: true, searchText: true } as const;

export type TemplateRow = Prisma.TemplateGetPayload<{ include: typeof templateInclude; omit: typeof light }>;

export const TEMPLATE_PAGE = 30;

export interface SearchHit {
  id: string;
  rank: number;
  snippet: string | null;
  lead: boolean;
  tail: boolean;
}

export interface TemplateData {
  ext: string;
  size: number;
  sha256: string;
  storageKey: string;
  content: string | null;
  textStatus: TemplateTextStatus;
  searchText: string;
}

export const templatesRepository = {
  findById: (id: string) => prisma.template.findUnique({ where: { id }, include: templateInclude, omit: light }),

  contentOf: async (id: string) => (await prisma.template.findUnique({ where: { id }, select: { content: true } }))?.content ?? null,

  findBySha: (sha256: string) => prisma.template.findUnique({ where: { sha256 }, select: { id: true, name: true } }),

  totalSize: async () => (await prisma.template.aggregate({ _sum: { size: true } }))._sum.size ?? 0,

  count: () => prisma.template.count(),

  /** Новіші першими; на одну більше — щоб знати, чи є ще */
  list: (ext: string | null, offset: number) =>
    prisma.template.findMany({
      where: ext ? { ext } : {},
      include: templateInclude,
      omit: light,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: TEMPLATE_PAGE + 1,
    }),

  byIds: (ids: string[]) => prisma.template.findMany({ where: { id: { in: ids } }, include: templateInclude, omit: light }),

  /**
   * Пошук підрядка: q — уже в нижньому регістрі (foldCase). Порядок: збіг у назві → в описі → у тексті, далі новіші.
   * searchText = назва \n опис \n текст, тож за позицією першого збігу видно, де він, а в тексті — звідки брати уривок.
   */
  search: (q: string, ext: string | null, offset: number) => {
    const qLen = Array.from(q).length;
    return prisma.$queryRaw<SearchHit[]>`
      WITH m AS (
        SELECT id, "createdAt", content, strpos("searchText", ${q}) AS pos,
               char_length(name) AS nl, char_length(coalesce(description, '')) AS dl
        FROM "Template"
        WHERE "searchText" LIKE ${likePattern(q)} ESCAPE '\\' AND (${ext}::text IS NULL OR ext = ${ext}::text)
      ), r AS (
        SELECT id, "createdAt", content, pos - nl - dl - 2 AS cp,
               CASE WHEN pos <= nl THEN 0 WHEN pos <= nl + 1 + dl THEN 1 ELSE 2 END AS rank
        FROM m
      )
      SELECT id, rank,
        CASE WHEN rank = 2 THEN substring(content from greatest(1, cp - ${SNIPPET_AROUND}::int) for ${qLen}::int + 2 * ${SNIPPET_AROUND}::int) END AS snippet,
        (rank = 2 AND cp - ${SNIPPET_AROUND}::int > 1) AS lead,
        (rank = 2 AND greatest(1, cp - ${SNIPPET_AROUND}::int) + ${qLen}::int + 2 * ${SNIPPET_AROUND}::int <= char_length(content)) AS tail
      FROM r
      ORDER BY rank, "createdAt" DESC, id DESC
      LIMIT ${TEMPLATE_PAGE + 1}::int OFFSET ${offset}::int`;
  },

  create: (data: TemplateData & { name: string; description: string | null; unitId: string | null; uploadedById: string }) =>
    prisma.template.create({ data, include: templateInclude, omit: light }),

  update: (id: string, data: Partial<TemplateData> & { name?: string; description?: string | null }) =>
    prisma.template.update({ where: { id }, data, include: templateInclude, omit: light }),

  remove: (id: string) => prisma.template.delete({ where: { id } }),

  /** Які з ключів файлів є в базі — для прибирання сиріт на диску */
  existingKeys: async (keys: string[]) =>
    new Set((await prisma.template.findMany({ where: { storageKey: { in: keys } }, select: { storageKey: true } })).map((t) => t.storageKey)),
};
