# --- Boscora Impacta Makefile ---
.PHONY: dapp dapp_install contract_build contract_test contract_clean help

dapp:
	bun run --cwd dapp dev

dapp_install:
	bun install --cwd ./dapp

# --------- CONTRACT BUILD/TEST/DEPLOY --------- #

# Build the contract
contract_build:
	@echo "Building contract..."
	stellar contract build

contract_test:
	cargo test

contract_clean:
	cargo clean

# Quick help
help:
	@echo "Available commands:"
	@echo "  make dapp           - Run dapp dev server"
	@echo "  make dapp_install   - Install dapp dependencies"
	@echo "  make contract_build - Build the contract"
	@echo "  make contract_test  - Run unit tests"
	@echo "  make contract_clean - Remove build artifacts"
