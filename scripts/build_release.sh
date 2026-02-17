#!/bin/bash
set -e

# This script builds the release packages for the project using a git worktree.
# Usage: ./scripts/build_release.sh <version>

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Error: Version (git ref) is required."
    echo "Usage: $0 <version>"
    exit 1
fi

# Get the absolute path of the project root
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
WORKTREE_PATH="$DIST_DIR/$VERSION"

echo "Building release for version/ref: $VERSION"

# Ensure dist directory exists
mkdir -p "$DIST_DIR"

# Clean up any existing directory/worktree at that path
if [ -d "$WORKTREE_PATH" ]; then
    echo "Removing existing directory at $WORKTREE_PATH"
    rm -rf "$WORKTREE_PATH"
    git worktree prune
fi

# Create git worktree
echo "Creating git worktree for $VERSION at $WORKTREE_PATH..."
git worktree add "$WORKTREE_PATH" "$VERSION"

# Ensure cleanup on exit
cleanup() {
    echo "Cleaning up worktree..."
    cd "$ROOT_DIR"
    if [ -d "$WORKTREE_PATH" ]; then
        # Remove the worktree folder
        git worktree remove "$WORKTREE_PATH" --force
    fi
}
trap cleanup EXIT

# Enter the worktree
cd "$WORKTREE_PATH"

# Update version in Go constants (only in this worktree)
echo "Updating version in pkg/core/constants.go..."
sed "s/const Version = \"dev\"/const Version = \"$VERSION\"/" pkg/core/constants.go > pkg/core/constants.go.tmp
mv pkg/core/constants.go.tmp pkg/core/constants.go

# Install frontend dependencies
echo "Installing frontend dependencies..."
(cd frontend && pnpm install)

# Build Frontend
echo "Building frontend..."
./scripts/build_and_copy_frontend.sh

# Build Backend for different architectures
build_backend() {
    local os=$1
    local arch=$2
    local ext=""
    local cc=""
    
    if [ "$os" == "windows" ]; then
        ext=".exe"
    fi

    # Determine if we need a cross-compiler
    local host_os=$(go env GOHOSTOS)
    local host_arch=$(go env GOHOSTARCH)

    if [ "$os" != "$host_os" ] || [ "$arch" != "$host_arch" ]; then
        if [ "$os" == "linux" ] && [ "$arch" == "arm64" ]; then
            cc="aarch64-linux-gnu-gcc"
        elif [ "$os" == "windows" ] && [ "$arch" == "amd64" ]; then
            cc="x86_64-w64-mingw32-gcc"
        elif [ "$os" == "darwin" ]; then
            cc="o64-clang"
        fi

        if [ -n "$cc" ] && ! command -v "$cc" &> /dev/null; then
            echo "Skipping $os/$arch: Cross-compiler '$cc' not found."
            return 0
        fi
    fi

    local output_name="ihpp${ext}"
    local archive_name="inspect-http-proxy-plus-${os}-${arch}.tar.gz"

    echo "Building for $os/$arch..."
    # CGO is necessary for fts5 support in sqlite3
    if [ -n "$cc" ]; then
        CC=$cc GOOS=$os GOARCH=$arch CGO_ENABLED=1 go build -tags fts5 -ldflags="-s -w" -o "$output_name" ./cmd/proxy/main.go
    else
        GOOS=$os GOARCH=$arch CGO_ENABLED=1 go build -tags fts5 -ldflags="-s -w" -o "$output_name" ./cmd/proxy/main.go
    fi
    
    if [ ! -f "$output_name" ]; then
        echo "Failed to build for $os/$arch"
        return 0
    fi

    echo "Packaging for $os/$arch..."
    tar -czvf "$archive_name" "$output_name" LICENSE README.md .proxy.config.toml.example
    
    # Copy to the dist directory (../)
    cp "$archive_name" "../"
    
    rm "$output_name"
    rm "$archive_name"
}

# Build for supported architectures
build_backend "linux" "amd64"
build_backend "linux" "arm64"
build_backend "windows" "amd64"
build_backend "darwin" "arm64"

echo "Release build process finished. Check $DIST_DIR/ for successful builds."
