#!/bin/bash

cd frontend
pnpm install
cd ..
go mod tidy
