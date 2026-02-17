# Installation

There are three ways to install `ihpp`.

## 1. Recommended: Pre-built Binaries
Download the latest version for your platform from the [Releases](https://github.com/liyu1981/inspect-http-proxy-plus/releases) page.

1. Download the archive for your OS/Architecture (e.g., `ihpp-linux-amd64.tar.gz`).
2. Extract the binary.
3. Move it to your path (e.g., `/usr/local/bin`).

## 2. Recommended: Go Install
If you have Go 1.22+ installed, you can install `ihpp` directly:

```bash
go install github.com/liyu1981/inspect-http-proxy-plus@latest
```

## 3. From Source
To build from source, you will need **Go 1.22+** and **pnpm** (for the frontend).

```bash
# Clone the repository
git clone https://github.com/liyu1981/inspect-http-proxy-plus.git
cd inspect-http-proxy-plus

# Build the frontend assets
./scripts/build_and_copy_frontend.sh

# Build the Go binary
./scripts/build.sh
```

The resulting `ihpp` binary will be in the project root.
