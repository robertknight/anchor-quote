#!/usr/bin/env sh

# Fetch the public annotations at a given PDF URL and compare anchoring results
# using dom-anchor-text-quote (the Hypothesis client's existing library) and
# this library.
#
# To use this you will need the `pdftotext` tool from poppler. On macOS you
# can install this with `brew install poppler`. On Linux this tool is typically
# in "poppler-utils" or a similar package.
#
# Usage:
#
#   compare-pdf-url.sh $URL

set -eu

tools_dir=$(dirname $0)
URL=$1

pdf_path=$TMPDIR/compare-url-doc.pdf
html_path=$TMPDIR/compare-url-doc.html
json_path=$TMPDIR/compare-url-annotations.json

curl --location --silent "$URL" > $pdf_path
echo "Saved PDF to $pdf_path"

pdftotext $pdf_path $html_path

$tools_dir/fetch-annotations.py "$URL" > $json_path
echo "Saved annotation JSON data to $json_path"

$tools_dir/run-benchmark.ts $html_path $json_path
