/**
 * Accounts contract: users and bearer API tokens shared by web, MCP and CLI.
 * MVP login is a development login by display name; real identity providers come later.
 */
import type { AppError, Result, UserId } from "@fp/kernel";

export interface User {
  readonly id: UserId;
  readonly displayName: string;
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
  devLogin(displayName: string): Promise<Result<{ readonly user: User; readonly token: IssuedToken }, AppError>>;
  getUser(id: UserId): Promise<User | null>;
  issueToken(userId: UserId, label: string): Promise<Result<IssuedToken, AppError>>;
  listTokens(userId: UserId): Promise<readonly TokenInfo[]>;
  revokeToken(userId: UserId, tokenId: string): Promise<Result<void, AppError>>;
  /** Returns the user for a valid, unrevoked token. */
  authenticate(token: string): Promise<User | null>;
}
