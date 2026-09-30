import { appError, asId, err, newId, ok, type Clock, type Db, type Logger, type UserId } from "@fp/kernel";
import type { AccountsService, IssuedToken, TokenInfo, User } from "./contract/index.ts";
import { generateToken, hashToken, isWellFormedToken } from "./tokens.ts";
import { normalizeDisplayName, normalizeTokenLabel } from "./validation.ts";

/** Label of the token issued by devLogin. */
export const WEB_TOKEN_LABEL = "web";
/** lastUsedAt is refreshed at most once per this interval per token, to limit writes on hot paths. */
export const LAST_USED_WRITE_INTERVAL_MS = 60_000;

export interface AccountsServiceDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly logger: Logger;
}

interface UserRow {
  id: string;
  display_name: string;
  created_at: unknown;
}

interface TokenRow {
  id: string;
  label: string;
  created_at: unknown;
  last_used_at: unknown;
}

interface AuthRow extends UserRow {
  token_id: string;
  last_used_at: unknown;
}

/** timestamptz comes back as Date from both pg and PGlite; be tolerant of strings too. */
function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function toUser(row: UserRow): User {
  return { id: asId<UserId>(row.id), displayName: row.display_name, createdAt: toIso(row.created_at) };
}

function toTokenInfo(row: TokenRow): TokenInfo {
  const base = { tokenId: row.id, label: row.label, createdAt: toIso(row.created_at) };
  return row.last_used_at == null ? base : { ...base, lastUsedAt: toIso(row.last_used_at) };
}

const USER_COLUMNS = "id, display_name, created_at";

export function createAccountsService({ db, clock, logger }: AccountsServiceDeps): AccountsService {
  /** Inserts a token row and returns the plaintext once. Never log `token`. */
  async function insertToken(tx: Db, userId: UserId, label: string): Promise<IssuedToken> {
    const token = generateToken();
    const tokenId = newId();
    const createdAt = clock.now().toISOString();
    await tx.query(
      `insert into accounts.tokens (id, user_id, token_hash, label, created_at) values ($1, $2, $3, $4, $5)`,
      [tokenId, userId, hashToken(token), label, createdAt],
    );
    logger.info("accounts.token_issued", { userId, tokenId, label });
    return { token, tokenId, label, createdAt };
  }

  async function findUser(tx: Db, id: string): Promise<User | null> {
    const r = await tx.query<UserRow>(`select ${USER_COLUMNS} from accounts.users where id = $1`, [id]);
    const row = r.rows[0];
    return row ? toUser(row) : null;
  }

  return {
    async devLogin(displayName) {
      const name = normalizeDisplayName(displayName);
      if (!name.ok) return name;
      const { displayName: shown, key } = name.value;
      const result = await db.transaction(async (tx) => {
        // Insert-if-absent is race-safe: concurrent logins with the same key converge on one row.
        const inserted = await tx.query<UserRow>(
          `insert into accounts.users (id, display_name, name_key, created_at) values ($1, $2, $3, $4)
           on conflict (name_key) do nothing
           returning ${USER_COLUMNS}`,
          [newId(), shown, key, clock.now().toISOString()],
        );
        let row = inserted.rows[0];
        if (row) {
          logger.info("accounts.user_created", { userId: row.id });
        } else {
          const existing = await tx.query<UserRow>(`select ${USER_COLUMNS} from accounts.users where name_key = $1`, [
            key,
          ]);
          row = existing.rows[0];
          if (!row) throw new Error("accounts: user vanished between insert and select");
        }
        const user = toUser(row);
        const token = await insertToken(tx, user.id, WEB_TOKEN_LABEL);
        return { user, token };
      });
      return ok(result);
    },

    getUser(id) {
      return findUser(db, id);
    },

    async issueToken(userId, label) {
      const normalized = normalizeTokenLabel(label);
      if (!normalized.ok) return normalized;
      return db.transaction(async (tx) => {
        const user = await findUser(tx, userId);
        if (!user) return err(appError("not_found", "사용자를 찾을 수 없습니다."));
        return ok(await insertToken(tx, user.id, normalized.value));
      });
    },

    async listTokens(userId) {
      const r = await db.query<TokenRow>(
        `select id, label, created_at, last_used_at from accounts.tokens
         where user_id = $1 and revoked_at is null
         order by created_at, id`,
        [userId],
      );
      return r.rows.map(toTokenInfo);
    },

    async revokeToken(userId, tokenId) {
      // Scoped by user_id: another user's token is indistinguishable from a missing one.
      // Idempotent: revoking an already revoked token succeeds and keeps the original revoked_at.
      const r = await db.query<{ id: string }>(
        `update accounts.tokens set revoked_at = coalesce(revoked_at, $3)
         where id = $1 and user_id = $2
         returning id`,
        [tokenId, userId, clock.now().toISOString()],
      );
      if (r.rows.length === 0) return err(appError("not_found", "토큰을 찾을 수 없습니다."));
      logger.info("accounts.token_revoked", { userId, tokenId });
      return ok(undefined);
    },

    async authenticate(token) {
      if (!isWellFormedToken(token)) return null;
      const r = await db.query<AuthRow>(
        `select u.id, u.display_name, u.created_at, t.id as token_id, t.last_used_at
         from accounts.tokens t join accounts.users u on u.id = t.user_id
         where t.token_hash = $1 and t.revoked_at is null`,
        [hashToken(token)],
      );
      const row = r.rows[0];
      if (!row) return null;
      const now = clock.now();
      const lastUsed = row.last_used_at == null ? null : new Date(toIso(row.last_used_at));
      if (lastUsed === null || now.getTime() - lastUsed.getTime() >= LAST_USED_WRITE_INTERVAL_MS) {
        // The guard in SQL keeps concurrent requests from writing more than once per interval.
        const threshold = new Date(now.getTime() - LAST_USED_WRITE_INTERVAL_MS).toISOString();
        await db.query(
          `update accounts.tokens set last_used_at = $2
           where id = $1 and (last_used_at is null or last_used_at <= $3)`,
          [row.token_id, now.toISOString(), threshold],
        );
      }
      return toUser(row);
    },
  };
}
