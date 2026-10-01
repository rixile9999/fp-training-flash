import { createInterface } from "node:readline";

/** Line-oriented questions for interactive commands (checkpoint, placement). */
export interface Prompter {
  /** Shows `question` and resolves with the next input line, or null when input ended (EOF, Ctrl-C, Ctrl-D). */
  ask(question: string): Promise<string | null>;
  close(): void;
}

/**
 * Prompter over node:readline. Lines that arrive before a question is asked are queued (piped input), and a
 * closed input answers every pending and later question with null so callers can abort cleanly.
 */
export function readlinePrompter(
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  terminal = Boolean((input as { isTTY?: boolean }).isTTY),
): Prompter {
  const rl = createInterface({ input, output, terminal });
  const queued: string[] = [];
  let waiting: ((line: string | null) => void) | null = null;
  let closed = false;
  rl.on("line", (line) => {
    if (waiting) {
      const resolve = waiting;
      waiting = null;
      resolve(line);
    } else queued.push(line);
  });
  rl.on("close", () => {
    closed = true;
    const resolve = waiting;
    waiting = null;
    resolve?.(null);
  });
  // Without a listener readline only pauses on Ctrl-C; treat it as "stop".
  rl.on("SIGINT", () => rl.close());
  return {
    ask(question) {
      if (queued.length > 0) {
        output.write(question);
        return Promise.resolve(queued.shift() ?? null);
      }
      if (closed) return Promise.resolve(null);
      rl.setPrompt(question);
      rl.prompt();
      return new Promise((resolve) => {
        waiting = resolve;
      });
    },
    close() {
      if (!closed) rl.close();
    },
  };
}
