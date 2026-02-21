# --- Boscora Impacta Makefile ---
.PHONY: dapp dapp_install contract_build contract_test contract_clean help

ifndef network
   override network = testnet
endif

ifndef wasm
	override wasm = target/wasm32v1-none/release/boscora_nft.optimized.wasm
endif

override boscora_nft_id = $(shell cat .stellar/boscora_nft_id-$(network))

dapp:
	bun run --cwd dapp dev

dapp_install:
	bun install --cwd ./dapp

# --------- CONTRACT BUILD/TEST/DEPLOY --------- #

# Build the contract
contract_build:
	stellar contract build
	@ls -l target/wasm32v1-none/release/*.wasm

contract_test:
	cargo test

contract_build-release: contract_build
	stellar contract optimize --wasm target/wasm32v1-none/release/boscora_nft.wasm
	stellar contract optimize --wasm target/wasm32v1-none/release/boscora_oracle.wasm
	@ls -l target/wasm32v1-none/release/*.wasm

# --contract-id $(boscora_nft_id-$(network))
contract_bindings: contract_build-release  ## Create bindings
	stellar contract bindings typescript \
		--network $(network) \
		--wasm $(wasm) \
		--output-dir dapp/packages/boscora-nft \
		--overwrite && \
	cd dapp/packages/boscora-nft && \
	bun install --latest && \
	bun run build && \
	cd ../.. && \
	bun format

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
