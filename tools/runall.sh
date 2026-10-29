#!/bin/bash
# run every level in small batches (software GL is slow); kills stray browsers between batches
cd "$(dirname "$0")"
for g in ${@:-0,1,2 3,4,5 6,7,8 9,10 11,12 13,14 15,16 17,18 19,20 21}; do echo "== $g"; timeout 900 node run.js $g 2>&1 | grep -v '^\s*at \|^$'; pkill -f '[p]w-browsers/chrom' ; done
echo "== finished"
