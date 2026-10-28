#!/bin/bash
# build test page from ../src.html (serve tools/ on :8765); copies ../assets so the illustrations load
cd "$(dirname "$0")"
{ echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'; sed 's#https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js#/node_modules/three/build/three.module.js#' ../src.html; echo '</body></html>'; } > test.html
rm -rf assets && cp -r ../assets assets
