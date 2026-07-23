#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
DIST_DIR="$PROJECT_ROOT/dist"

if [ "$DIST_DIR" != "$PROJECT_ROOT/dist" ]; then
  echo "Refusing to clean an unexpected dist path: $DIST_DIR" >&2
  exit 1
fi

if [ -e "$DIST_DIR" ] && [ ! -d "$DIST_DIR" ]; then
  echo "Cannot build: $DIST_DIR exists and is not a directory." >&2
  exit 1
fi

mkdir -p "$DIST_DIR"
find "$DIST_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +

mkdir -p \
  "$DIST_DIR/assets/audio/languages" \
  "$DIST_DIR/assets/css" \
  "$DIST_DIR/assets/js" \
  "$DIST_DIR/data"

cp "$PROJECT_ROOT/index.html" "$DIST_DIR/index.html"
cp "$PROJECT_ROOT/assets/css/styles.css" "$DIST_DIR/assets/css/styles.css"
cp "$PROJECT_ROOT/assets/css/effects.css" "$DIST_DIR/assets/css/effects.css"
cp "$PROJECT_ROOT/assets/js/app.js" "$DIST_DIR/assets/js/app.js"
cp "$PROJECT_ROOT/assets/js/effects.js" "$DIST_DIR/assets/js/effects.js"
cp "$PROJECT_ROOT/data/languages.json" "$DIST_DIR/data/languages.json"
cp "$PROJECT_ROOT"/assets/audio/languages/*.mp3 \
  "$DIST_DIR/assets/audio/languages/"

if [ -f "$PROJECT_ROOT/assets/audio/background-music.mp3" ]; then
  cp "$PROJECT_ROOT/assets/audio/background-music.mp3" \
    "$DIST_DIR/assets/audio/background-music.mp3"
fi

echo "Built deployable website in $DIST_DIR"
