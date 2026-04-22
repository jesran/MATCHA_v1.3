#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

log() {
  printf '%s\n' "$1"
}

has_command() {
  command -v "$1" >/dev/null 2>&1
}

refresh_path() {
  if [ -d /opt/homebrew/bin ]; then
    export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"
  fi

  if [ -d /usr/local/bin ]; then
    export PATH="/usr/local/bin:$PATH"
  fi
}

install_homebrew() {
  log ""
  log "Homebrew is not installed."
  log "Installing Homebrew so this Mac can install Node.js and Python..."

  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  refresh_path

  if ! has_command brew; then
    log ""
    log "Homebrew installation finished, but brew is still not available in PATH."
    log "Open a new Terminal window and run this file again."
    exit 1
  fi
}

ensure_brew_package() {
  local package="$1"
  local description="$2"

  if brew list "$package" >/dev/null 2>&1; then
    log "$description is already installed."
    return
  fi

  log ""
  log "Installing $description..."
  brew install "$package"
}

main() {
  refresh_path

  log "Starting Matcha Mac setup..."

  if ! has_command brew; then
    install_homebrew
  fi

  ensure_brew_package node "Node.js"
  ensure_brew_package python "Python"

  refresh_path

  if ! has_command node; then
    log ""
    log "Node.js installation did not finish correctly. Please rerun this file."
    exit 1
  fi

  if ! has_command python3 && ! has_command python; then
    log ""
    log "Python installation did not finish correctly. Please rerun this file."
    exit 1
  fi

  log ""
  log "System prerequisites are ready."
  log "Running setup.js..."
  log ""

  exec node setup.js
}

main "$@"
