import { describe, expect, it } from "vitest";
import { isTailnetOrLoopback } from "../vite.config.ts";

describe("dev server remote guard", () => {
  it("serves only loopback and Tailscale addresses", () => {
    for (const a of ["127.0.0.1", "::1", "::ffff:127.0.0.1", "100.124.74.15", "::ffff:100.64.0.1", "100.127.255.254", "fd7a:115c:a1e0::5e3b:4a10"])
      expect(isTailnetOrLoopback(a), a).toBe(true);
    for (const a of [undefined, "", "192.168.0.10", "::ffff:10.0.0.2", "100.63.0.1", "100.128.0.1", "fe80::1", "2001:db8::1"])
      expect(isTailnetOrLoopback(a), String(a)).toBe(false);
  });
});
