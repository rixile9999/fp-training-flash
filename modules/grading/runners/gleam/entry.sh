#!/bin/sh
# Runs one grading job inside a prepared project directory (template + job files + .fp/{nonce,job.json}).
# Used by both runners: the Docker image (via run-job.sh) and the local development runner.
#
# stdout protocol: marker lines "@@FP:<nonce>@@{json}". The compiler output is printed between the
# build_begin and build_end markers; learner code only runs after build_end, so it cannot forge them.
set -u
cd "$1" || exit 70
nonce=$(cat .fp/nonce) || exit 70
m="@@FP:${nonce}@@"
version=$(gleam --version 2>/dev/null | sed 's/[^A-Za-z0-9 ._-]//g')
printf '\n%s{"type":"build_begin","gleam":"%s"}\n' "$m" "$version"
gleam build --target erlang 2>&1
code=$?
printf '\n%s{"type":"build_end","exitCode":%d}\n' "$m" "$code"
[ "$code" -eq 0 ] || exit 0
# One scheduler keeps reductions comparable and the thread count small (pids limit).
exec erl +S 1:1 +SDcpu 1:1 +SDio 1 +A 1 -noinput -pa build/dev/erlang/*/ebin \
  -eval "'fp_internal@harness':main()"
