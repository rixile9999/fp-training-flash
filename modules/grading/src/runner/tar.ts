/** Minimal ustar writer: the Docker runner streams job files to the container's stdin as a tar. */
import type { ProjectFile } from "./project.ts";

const BLOCK = 512;

function octal(value: number, width: number): string {
  return value.toString(8).padStart(width - 1, "0") + "\0";
}

function header(name: string, size: number, type: "0" | "5", mode: number, mtime: number): Buffer {
  const h = Buffer.alloc(BLOCK, 0);
  const nameBytes = Buffer.from(name, "utf8");
  if (nameBytes.length > 100) throw new Error(`tar path too long: ${name}`);
  nameBytes.copy(h, 0);
  h.write(octal(mode, 8), 100, "ascii");
  h.write(octal(0, 8), 108, "ascii");
  h.write(octal(0, 8), 116, "ascii");
  h.write(octal(size, 12), 124, "ascii");
  h.write(octal(mtime, 12), 136, "ascii");
  h.write("        ", 148, "ascii");
  h.write(type, 156, "ascii");
  h.write("ustar\0", 257, "ascii");
  h.write("00", 263, "ascii");
  let sum = 0;
  for (const byte of h) sum += byte;
  h.write(sum.toString(8).padStart(6, "0") + "\0 ", 148, "ascii");
  return h;
}

/** Builds a tar with directory entries for every parent directory. `mtime` is in seconds. */
export function createTar(files: readonly ProjectFile[], mtime: number): Buffer {
  const parts: Buffer[] = [];
  const dirs = new Set<string>();
  for (const f of files) {
    const segments = f.path.split("/");
    for (let i = 1; i < segments.length; i++) {
      const dir = `${segments.slice(0, i).join("/")}/`;
      if (dirs.has(dir)) continue;
      dirs.add(dir);
      parts.push(header(dir, 0, "5", 0o755, mtime));
    }
    const body = Buffer.from(f.content, "utf8");
    parts.push(header(f.path, body.length, "0", 0o644, mtime), body);
    const pad = (BLOCK - (body.length % BLOCK)) % BLOCK;
    if (pad) parts.push(Buffer.alloc(pad, 0));
  }
  parts.push(Buffer.alloc(BLOCK * 2, 0));
  return Buffer.concat(parts);
}
