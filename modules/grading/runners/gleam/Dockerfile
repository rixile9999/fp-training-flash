# fp-gleam-runner: sandbox image for grading Gleam submissions.
# Build with ./build-image.sh (tag fp-gleam-runner:1.18.1). The base image is pinned by digest
# (gleam 1.18.1, Erlang/OTP 29, Alpine; multi-arch index covering amd64 and arm64).
FROM ghcr.io/gleam-lang/gleam:v1.18.1-erlang-alpine@sha256:7c82e4a284b7c05c26eac34db497ea0e63ce7cb04bd019d966d70338eb172b68

# Unprivileged runner user. Jobs run with --user 10001:10001, so /etc/passwd is not needed at run time;
# it is made unreadable for that user (learner code must not be able to read it).
RUN addgroup -S -g 10001 runner \
 && adduser -S -D -H -u 10001 -G runner -h /work -s /sbin/nologin runner \
 && chmod 0600 /etc/passwd /etc/group /etc/shadow

# Template project with pinned deps: downloaded and compiled at image build time so jobs need no network.
COPY template/gleam.toml template/manifest.toml /opt/fp/template/
COPY template/src /opt/fp/template/src
RUN cd /opt/fp/template \
 && gleam deps download \
 && gleam build --target erlang \
 && rm -rf /root/.cache \
 && chmod -R a+rX,go-w /opt/fp

COPY --chmod=0555 entry.sh run-job.sh /opt/fp/
# Resolve names from /etc/hosts only. With --network none the default resolver waits ~5s for an
# unreachable DNS server every time erl starts (gleam build runs erl too).
COPY --chmod=0444 inetrc /opt/fp/inetrc

ENV HOME=/work LANG=C.UTF-8 ERL_CRASH_DUMP_BYTES=0 ERL_INETRC=/opt/fp/inetrc
WORKDIR /work
USER 10001:10001
ENTRYPOINT ["/opt/fp/run-job.sh"]
