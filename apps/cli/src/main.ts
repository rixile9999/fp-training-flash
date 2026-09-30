#!/usr/bin/env node
import { runCli } from "./cli.ts";

const code = await runCli(process.argv.slice(2), {
  env: process.env,
  cwd: process.cwd(),
  stdout: (t) => process.stdout.write(t + "\n"),
  stderr: (t) => process.stderr.write(t + "\n"),
});
process.exitCode = code;
