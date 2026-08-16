#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK_DIR="${MSIX_SDK_DIR:-$ROOT/.tools/msix-sdk}"
OUTPUT="$ROOT/.tools/makemsix/makemsix"

if [[ -x "$OUTPUT" ]]; then
  echo "makemsix is ready: $OUTPUT"
  exit 0
fi

if ! command -v cmake >/dev/null 2>&1; then
  echo "cmake is required. Run: brew install cmake"
  exit 1
fi
if ! command -v git >/dev/null 2>&1; then
  echo "git is required."
  exit 1
fi

if [[ ! -f "$SDK_DIR/makemac.sh" ]]; then
  echo "Downloading Microsoft's MSIX SDK..."
  mkdir -p "$(dirname "$SDK_DIR")"
  git clone --depth 1 https://github.com/microsoft/msix-packaging.git "$SDK_DIR"
fi

echo "Building makemsix for Apple Silicon..."
(
  cd "$SDK_DIR"
  ./makemac.sh --pack --skip-samples --skip-tests -arch arm64
)

if [[ ! -f "$SDK_DIR/.vs/bin/makemsix" ]]; then
  echo "The MSIX SDK build did not create .vs/bin/makemsix"
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT")"
cp "$SDK_DIR/.vs/bin/makemsix" "$OUTPUT"
chmod +x "$OUTPUT"
echo "makemsix ready: $OUTPUT"
