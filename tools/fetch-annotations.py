#!/usr/bin/env python3

# Fetch all public annotations from Hypothesis on a given URL.
#
# Usage:
#
#   pip3 install requests
#   ./fetch-annotations.py <URL>

import json
import sys

import requests

url = sys.argv[1]
annotations = []

search_after = ""

while True:
    results = requests.get(
        "https://hypothes.is/api/search",
        params={
            "limit": 200,
            "order": "desc",
            "search_after": search_after,
            "sort": "updated",
            "uri": url,
        },
    )
    results = results.json()["rows"]
    annotations += results
    if len(results) == 0:
        break
    search_after = results[-1]["updated"]
    print(
        f"Fetched {len(annotations)} annotations. Search after {search_after}",
        file=sys.stderr,
    )

print(json.dumps(annotations))
