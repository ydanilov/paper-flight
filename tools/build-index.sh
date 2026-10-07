#!/bin/bash
# regenerate ../index.html (full page) from ../src.html (artifact body)
cd "$(dirname "$0")/.." && { echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'; cat src.html; echo '</body></html>'; } > index.html
