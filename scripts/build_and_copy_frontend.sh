#!/bin/bash
set -e

cd frontend
pnpm build
mkdir -p ../pkg/web/ui/out
rm -rf ../pkg/web/ui/out/*
cp -r ./out/* ../pkg/web/ui/out/
cd -