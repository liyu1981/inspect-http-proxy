#!/bin/bash
set -e

echo "Building Docusaurus documentation..."
cd docs
pnpm install
pnpm run build
cd ..

echo "Documentation built successfully in docs/build/"
