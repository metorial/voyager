import { and, arrayOverlaps, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { Record as DbRecord, Index } from '../../../prisma/generated/client';
import { Backend, type SearchParams } from '../_backend';
import { db, records } from './schema';
import { normalizeSearchQuery } from '../../utils/searchQuery';

export class PgBackend extends Backend {
  override isEnabled(): boolean {
    return !!db;
  }

  async indexRecords(index: Index, recordsToInsert: DbRecord[]) {
    if (!db) throw new Error('Database not initialized');

    if (recordsToInsert.length === 0) return;

    for (let r of recordsToInsert) {
      let inner = {
        tenantOids: r.isTenantSpecific ? r.tenantOids : null,
        fields: r.fields,
        body:
          typeof r.body == 'string'
            ? r.body
            : Object.values(r.body as any)
                .filter(Boolean)
                .join(', ')
      };

      await db
        .insert(records)
        .values({
          indexId: index.oid,
          documentId: r.documentId,
          ...inner
        })
        .onConflictDoUpdate({
          target: records.documentId,
          set: inner
        });
    }
  }

  async deleteRecordsById(index: Index, recordIds: string[]) {
    if (!db) throw new Error('Database not initialized');

    if (recordIds.length === 0) return;

    await db
      .delete(records)
      .where(and(eq(records.indexId, index.oid), inArray(records.documentId, recordIds)));
  }

  async searchRecords(index: Index, { query, filters, tenantOids }: SearchParams) {
    if (!db) throw new Error('Database not initialized');

    let wheres: any[] = [eq(records.indexId, index.oid)];

    if (query) {
      let normalizedQuery = normalizeSearchQuery(query);

      if (normalizedQuery) {
        wheres.push(sql`
          (
            body_search @@ plainto_tsquery('english', ${normalizedQuery})
            OR (
              char_length(${normalizedQuery}) >= 3
              AND ${normalizedQuery} <% body
            )
          )
        `);
      }
    }

    // JSON filters
    if (filters && Object.keys(filters).length > 0) {
      for (let [key, value] of Object.entries(filters)) {
        wheres.push(sql`fields @> ${JSON.stringify({ [key]: value })}::jsonb`);
      }
    }

    if (tenantOids?.length) {
      wheres.push(
        or(isNull(records.tenantOids), arrayOverlaps(records.tenantOids, tenantOids))
      );
    } else {
      wheres.push(isNull(records.tenantOids));
    }

    let result = await db
      .select()
      .from(records)
      .where(and(...wheres))
      .limit(100);

    return { records: result };
  }
}
