#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log() {
  printf '%s\n' "$1"
}

has_command() {
  command -v "$1" >/dev/null 2>&1
}

install_with_apt() {
  sudo apt-get update
  sudo apt-get install -y nodejs npm python3 python3-pip
}

install_with_dnf() {
  sudo dnf install -y nodejs npm python3 python3-pip
}

install_with_yum() {
  sudo yum install -y nodejs npm python3 python3-pip
}

install_with_pacman() {
  sudo pacman -Sy --noconfirm nodejs npm python python-pip
}

install_with_zypper() {
  sudo zypper install -y nodejs npm python3 python3-pip
}

install_prerequisites() {
  log ""
  log "Installing Node.js, npm, Python, and pip for Linux..."

  if has_command apt-get; then
    install_with_apt
    return
  fi

  if has_command dnf; then
    install_with_dnf
    return
  fi

  if has_command yum; then
    install_with_yum
    return
  fi

  if has_command pacman; then
    install_with_pacman
    return
  fi

  if has_command zypper; then
    install_with_zypper
    return
  fi

  log ""
  log "Could not detect a supported Linux package manager."
  log "Please install Node.js, npm, Python 3, and pip manually, then rerun this script."
  exit 1
}

main() {
  log "Starting Matcha Linux setup..."

  if ! has_command node || ! has_command npm || (! has_command python3 && ! has_command python) || ! has_command pip3; then
    install_prerequisites
  fi

  if ! has_command node || ! has_command npm || (! has_command python3 && ! has_command python); then
    log ""
    log "One or more required tools are still missing after installation."
    log "Please install Node.js, npm, Python 3, and pip manually, then rerun this script."
    exit 1
  fi

  log ""
  log "System prerequisites are ready."
  log "Running setup.js..."
  log ""

  exec node setup.js
}

main "$@"
