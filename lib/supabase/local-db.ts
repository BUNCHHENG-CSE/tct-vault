import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  buildSeedDataset,
  DEMO_USER_EMAIL,
  DEMO_USER_ID,
  type SeedDataset,
} from "@/lib/seed-data";

const DB_FILE_PATH = path.join(process.cwd(), "supabase", ".local-db.json");

type TableName = keyof SeedDataset;
type RowRecord = Record<string, unknown>;

export function readLocalDb(): SeedDataset {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw) as SeedDataset;
      if (
        parsed &&
        Array.isArray(parsed.accounts) &&
        Array.isArray(parsed.transactions) &&
        Array.isArray(parsed.subscriptions) &&
        Array.isArray(parsed.budgets)
      ) {
        if (!Array.isArray(parsed.goals)) {
          parsed.goals = buildSeedDataset(DEMO_USER_ID).goals;
          writeLocalDb(parsed);
        }
        return parsed;
      }
    }
  } catch {
    // Fall back to freshly seeded dataset if file is missing or corrupted
  }

  const seeded = buildSeedDataset(DEMO_USER_ID);
  writeLocalDb(seeded);
  return seeded;
}

export function writeLocalDb(data: SeedDataset): void {
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Ignore write errors in read-only environments
  }
}

export function resetLocalDbWithSeed(userId: string = DEMO_USER_ID): SeedDataset {
  const seeded = buildSeedDataset(userId);
  writeLocalDb(seeded);
  return seeded;
}

class LocalQueryBuilder {
  private table: TableName;
  private operation: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private selectColumns = "*";
  private filters: Array<(row: RowRecord) => boolean> = [];
  private sortColumn: string | null = null;
  private sortAsc = true;
  private isSingle = false;
  private payload: RowRecord | RowRecord[] | null = null;
  private upsertConflict: string | null = null;

  constructor(table: TableName) {
    this.table = table;
  }

  select(columns = "*") {
    this.selectColumns = columns;
    return this;
  }

  insert(values: RowRecord | RowRecord[]) {
    this.operation = "insert";
    this.payload = values;
    return this;
  }

  update(values: RowRecord) {
    this.operation = "update";
    this.payload = values;
    return this;
  }

  upsert(values: RowRecord | RowRecord[], options?: { onConflict?: string }) {
    this.operation = "upsert";
    this.payload = values;
    this.upsertConflict = options?.onConflict || null;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => String(row[column]) === String(value));
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push((row) => String(row[column] ?? "") >= String(value));
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.sortColumn = column;
    this.sortAsc = options?.ascending ?? true;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  private execute(): { data: unknown; error: { message: string } | null } {
    const db = readLocalDb();
    const rows = (db[this.table] as unknown as RowRecord[]) || [];

    if (this.operation === "insert") {
      const items = Array.isArray(this.payload)
        ? this.payload
        : this.payload
        ? [this.payload]
        : [];
      const nowIso = new Date().toISOString();

      const inserted = items.map((item) => ({
        id: (item.id as string) || crypto.randomUUID(),
        user_id: (item.user_id as string) || DEMO_USER_ID,
        created_at: (item.created_at as string) || nowIso,
        ...item,
      }));

      (db[this.table] as unknown as RowRecord[]) = [...rows, ...inserted];
      writeLocalDb(db);

      return {
        data: this.isSingle ? inserted[0] ?? null : inserted,
        error: null,
      };
    }

    if (this.operation === "update") {
      const updates = (this.payload as RowRecord) || {};
      const updatedRows: RowRecord[] = [];

      const nextRows = rows.map((row) => {
        const matches = this.filters.every((fn) => fn(row));
        if (!matches) return row;
        const updated = { ...row, ...updates };
        updatedRows.push(updated);
        return updated;
      });

      (db[this.table] as unknown as RowRecord[]) = nextRows;
      writeLocalDb(db);

      return {
        data: this.isSingle ? updatedRows[0] ?? null : updatedRows,
        error: null,
      };
    }

    if (this.operation === "upsert") {
      const items = Array.isArray(this.payload)
        ? this.payload
        : this.payload
        ? [this.payload]
        : [];
      const conflictKeys = (this.upsertConflict || "id")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const nowIso = new Date().toISOString();

      const nextRows = [...rows];
      const upserted: RowRecord[] = [];

      for (const item of items) {
        const existingIdx = nextRows.findIndex((row) =>
          conflictKeys.every((k) => String(row[k]) === String(item[k]))
        );

        if (existingIdx >= 0) {
          const merged = { ...nextRows[existingIdx], ...item };
          nextRows[existingIdx] = merged;
          upserted.push(merged);
        } else {
          const created = {
            id: (item.id as string) || crypto.randomUUID(),
            user_id: (item.user_id as string) || DEMO_USER_ID,
            created_at: (item.created_at as string) || nowIso,
            ...item,
          };
          nextRows.push(created);
          upserted.push(created);
        }
      }

      (db[this.table] as unknown as RowRecord[]) = nextRows;
      writeLocalDb(db);

      return {
        data: this.isSingle ? upserted[0] ?? null : upserted,
        error: null,
      };
    }

    if (this.operation === "delete") {
      const deletedRows: RowRecord[] = [];
      const remainingRows = rows.filter((row) => {
        const matches = this.filters.every((fn) => fn(row));
        if (matches) {
          deletedRows.push(row);
          return false;
        }
        return true;
      });

      (db[this.table] as unknown as RowRecord[]) = remainingRows;
      writeLocalDb(db);

      return {
        data: this.isSingle ? deletedRows[0] ?? null : deletedRows,
        error: null,
      };
    }

    // SELECT operation
    let result = rows.filter((row) => this.filters.every((fn) => fn(row)));

    // Attach joined account metadata when querying `*, accounts(name, type)` on transactions or goals
    if (this.table === "transactions" && this.selectColumns.includes("accounts")) {
      const accountMap = new Map(
        db.accounts.map((acc) => [acc.id, { name: acc.name, type: acc.type }])
      );
      result = result.map((row) => ({
        ...row,
        accounts: accountMap.get(String(row.account_id)) || {
          name: "Primary Account",
          type: "checking",
        },
      }));
    }

    if (this.table === "goals" && this.selectColumns.includes("accounts")) {
      const accountMap = new Map(
        db.accounts.map((acc) => [acc.id, { name: acc.name, type: acc.type }])
      );
      result = result.map((row) => ({
        ...row,
        accounts: row.account_id ? accountMap.get(String(row.account_id)) || null : null,
      }));
    }

    if (this.sortColumn) {
      const col = this.sortColumn;
      const asc = this.sortAsc;
      result = [...result].sort((a, b) => {
        const valA = a[col];
        const valB = b[col];
        if (typeof valA === "number" && typeof valB === "number") {
          return asc ? valA - valB : valB - valA;
        }
        return asc
          ? String(valA ?? "").localeCompare(String(valB ?? ""))
          : String(valB ?? "").localeCompare(String(valA ?? ""));
      });
    }

    if (this.isSingle) {
      if (result.length === 0) {
        return { data: null, error: { message: "Row not found" } };
      }
      return { data: result[0], error: null };
    }

    return { data: result, error: null };
  }

  then<TResult1 = { data: unknown; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export function createLocalSupabaseClient() {
  return {
    auth: {
      async getUser() {
        return {
          data: {
            user: {
              id: DEMO_USER_ID,
              email: DEMO_USER_EMAIL,
            },
          },
          error: null,
        };
      },
      async signInWithPassword({ email }: { email: string; password?: string }) {
        return {
          data: {
            user: {
              id: DEMO_USER_ID,
              email: email || DEMO_USER_EMAIL,
            },
          },
          error: null,
        };
      },
      async signUp({ email }: { email: string; password?: string }) {
        return {
          data: {
            user: {
              id: DEMO_USER_ID,
              email: email || DEMO_USER_EMAIL,
            },
          },
          error: null,
        };
      },
      async signOut() {
        return { error: null };
      },
    },
    from(table: TableName) {
      return new LocalQueryBuilder(table);
    },
  };
}
