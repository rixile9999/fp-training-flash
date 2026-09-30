#!/bin/sh
# Builds the Gleam grading sandbox image. Usage: ./build-image.sh [tag]   (default fp-gleam-runner:1.18.1)
# The tag must match the `image` option of createDockerGleamRunner (FP_GLEAM_IMAGE in apps).
set -eu
here=$(cd "$(dirname "$0")" && pwd)
tag=${1:-fp-gleam-runner:1.18.1}
docker build --pull=false -t "$tag" "$here"
echo "built $tag"
