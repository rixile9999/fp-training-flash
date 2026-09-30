#!/bin/sh
# Container entrypoint of fp-gleam-runner.
#   (no args) : stdin is a tar with src/, test/ and .fp/ entries of one job; runs it (see entry.sh).
#   --info    : prints {"gleam":"<version>","otp":"<release>"}.
set -eu
if [ "${1:-}" = "--info" ]; then
  gleam_version=$(gleam --version | sed 's/^gleam //')
  otp=$(erl -noshell -eval 'io:format("~s", [erlang:system_info(otp_release)]), halt().')
  printf '{"gleam":"%s","otp":"%s"}\n' "$gleam_version" "$otp"
  exit 0
fi
umask 077
mkdir /work/project
# tar keeps modification times, so gleam reuses the pre-compiled dependencies.
tar -C /opt/fp/template -cf - . | tar -C /work/project -xf -
tar -C /work/project -xf -
exec /opt/fp/entry.sh /work/project
