#!/bin/sh
# Every file under build/ is served with an immutable one-year cache (vercel.json),
# so a file must be RENAMED, never edited in place. Run this after editing anything
# in build/:  sh tools/rehash.sh
# It renames build/<name>.<anything>.<ext> to build/<name>.<12-hex content hash>.<ext>
# and rewrites every reference in the HTML pages.
set -e
cd "$(dirname "$0")/.."
for f in build/*; do
  base=$(basename "$f")
  name=${base%%.*}
  ext=${base##*.}
  hash=$(shasum -a 256 "$f" | cut -c1-12)
  new="$name.$hash.$ext"
  [ "$base" = "$new" ] && continue
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then git mv -f "$f" "build/$new"; else mv "$f" "build/$new"; fi
  for page in index.html 404.html */index.html; do
    [ -f "$page" ] || continue
    sed -i '' "s#build/$base#build/$new#g" "$page"
  done
  echo "$base -> $new"
done
