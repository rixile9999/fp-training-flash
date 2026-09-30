/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of apps/api. Default http://localhost:8787. */
  readonly VITE_API_URL?: string;
  /** "1" swaps the HTTP client for the in-memory fake (src/api/fake.ts). */
  readonly VITE_FAKE_API?: string;
}
