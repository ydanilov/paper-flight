#!/bin/bash
# build test page from ../src.html
{ echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'; sed 's#https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js#/node_modules/three/build/three.module.js#' ../src.html; echo '</body></html>'; } > test.html
