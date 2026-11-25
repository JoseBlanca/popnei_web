#!/bin/sh
# Builds the site as the lab's web site serves it, and packs it in a tarball
# for a GitHub Release, which the lab's site downloads and unpacks at the
# address the site was built for (its sites.yaml names the tarball).
#
#   scripts/pack-site.sh <address> <tarball>
#   scripts/pack-site.sh /popnei/app/ popnei_web-site.tar.gz
#
# The address is written into the pages at the build, so the tarball works
# only there. popgen2.html is the page at that address, as index.html; the
# start page under construction, popgen.html and the probe are left out.
set -eu

if [ $# -ne 2 ]; then
  echo "usage: $0 <address, such as /popnei/app/> <tarball>" >&2
  exit 2
fi
base=$1
tarball=$(cd "$(dirname "$2")" && pwd)/$(basename "$2")

case $base in
  /*/) ;;
  *)
    echo "the address starts and ends with /: $base" >&2
    exit 2
    ;;
esac

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
site=$work/site

npx vite build --base "$base" --outDir "$site" --emptyOutDir

mv "$site/popgen2.html" "$site/index.html"
rm "$site/popgen.html" "$site/probe.html"
rm -r "$site/probe"

# The members are relative to the site, "./index.html", as the lab's build
# expects: unpacked into the folder of the address, not into a folder of it.
tar czf "$tarball" -C "$site" .
echo "packed $tarball for $base"
