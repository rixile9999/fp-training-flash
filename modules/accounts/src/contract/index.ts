/**
 * Accounts contract: users and bearer API tokens shared by web, MCP and CLI.
 * MVP login is a development login by display name; real identity providers come later.
 */
import type { AppError, Locale, Result, UserId } from "@fp/kernel";

export interface User {
  readonly id: UserId;
  readonly displayName: string;
  /** Preferred UI/content language; defaults to "ko". */
  readonly locale: Locale;
  readonly createdAt: string;
}

export interface IssuedToken {
  /** Plaintext token, returned exactly once. Only a hash is stored. */
  readonly token: string;
  readonly tokenId: string;
  readonly label: string;
  readonly createdAt: string;
}

export interface TokenInfo {
  readonly tokenId: string;
  readonly label: string;
  readonly createdAt: string;
  readonly lastUsedAt?: string;
}

export interface AccountsService {
  /** Creates the user if the display name is new, otherwise returns the existing user. */
  /** `locale` sets the preference for a new user and updates it for an existing one when given. */
  devLogin(displayName: string, locale?: Locale): Promise<Result<{ readonly user: User; readonly token: IssuedToken }, AppError>>;
  setLocale(userId: UserId, locale: Locale): Promise<Result<User, AppError>>;
  getUser(id: UserId): Promise<User | null>;
  issueToken(userId: UserId, label: string): Promise<Result<IssuedToken, AppError>>;
  listTokens(userId: UserId): Promise<readonly TokenInfo[]>;
  revokeToken(userId: UserId, tokenId: string): Promise<Result<void, AppError>>;
  /** Returns the user for a valid, unrevoked token. */
  authenticate(token: string): Promise<User | null>;
}
