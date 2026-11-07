#!/bin/bash
# #265: the rendered WAVs from render-opening-night.mjs into the small AAC files the game ships. macOS's afconvert; nothing to install.
# usage: bash scripts/audio/encode.sh <wavDir> [stem…]. Name the stems you changed: afconvert stamps the time into each file, so encoding the rest makes them differ for nothing.
set -euo pipefail
wavs="$1"
shift
only=" $* "
root="$(cd "$(dirname "$0")/../.." && pwd)"
mkdir -p "$root/assets/audio/opening-night" "$root/assets/audio/idents"
for file in "$wavs"/*.wav; do
  name="$(basename "$file" .wav)"
  if [ "$only" != "  " ] && [[ "$only" != *" $name "* ]]; then continue; fi
  case "$name" in
    ident-*) afconvert -f m4af -d aac -b 80000 -q 127 "$file" "$root/assets/audio/idents/${name#ident-}.m4a" ;;
    *) afconvert -f m4af -d aac -b 96000 -q 127 "$file" "$root/assets/audio/opening-night/$name.m4a" ;;
  esac
done
du -sh "$root/assets/audio/opening-night" "$root/assets/audio/idents"
