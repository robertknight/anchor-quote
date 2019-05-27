#!/usr/bin/env sh

# Fetch the public annotations at a given URL and compare anchoring results
# using dom-anchor-text-quote (the Hypothesis client's existing library) and
# this library.
#
# Usage:
#
#   compare-url.sh $URL

set -eu

tools_dir=$(dirname $0)
URL=$1

html_path=$TMPDIR/compare-url-page.html
json_path=$TMPDIR/compare-url-annotations.json

curl --location --silent "$URL" > $html_path
echo "Saved HTML to $html_path"

$tools_dir/fetch-annotations.py "$URL" > $json_path
echo "Saved annotation JSON data to $json_path"

$tools_dir/run-benchmark.ts $html_path $json_path
