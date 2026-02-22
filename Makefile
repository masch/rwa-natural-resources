# --- Boscora Impacta Makefile ---
.PHONY: dapp dapp_install prepare-network prepare funds clean contract_build contract_test contract_build-release contract_bindings contract_deploy testnet_reset help

ifndef network
   override network = testnet
endif

ifndef wasm
	override wasm = target/wasm32v1-none/release/boscora_nft.optimized.wasm
endif

ifndef admin
   override admin = mando-$(network)
endif

override boscora_nft_id = $(shell cat .stellar/boscora_nft_id-$(network))

dapp:
	bun run --cwd dapp dev

dapp_install:
	bun install --cwd ./dapp

prepare-network:  ## Setup network
ifeq ($(network),testnet)
	stellar network add testnet \
		--rpc-url https://soroban-testnet.stellar.org:443 \
		--network-passphrase "Test SDF Network ; September 2015"
else ifeq ($(network),mainnet)
	stellar network add mainnet \
		--rpc-url https://rpc.lightsail.network/ \
		--network-passphrase "Public Global Stellar Network ; September 2015"
else
	stellar network add testnet-local \
		--rpc-url http://localhost:8000/soroban/rpc \
		--network-passphrase "Standalone Network ; February 2017"
endif

prepare: prepare-network  ## Setup network and generate addresses and add funds
	stellar keys generate grogu-$(network) --network $(network) && \
	stellar keys generate $(admin) --network $(network)

funds:
	stellar keys fund grogu-$(network) --network $(network) && \
	stellar keys fund $(admin) --network $(network)

clean:
	rm target/wasm32v1-none/release/*.wasm
	rm target/wasm32v1-none/release/*.d
	cargo clean

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

contract_deploy:  ## Deploy Soroban contract to testnet
	@echo "Deploying Oracle Contract..."
	stellar contract deploy \
  		--wasm target/wasm32v1-none/release/boscora_oracle.optimized.wasm \
  		--source-account $(admin) \
  		--network $(network) \
  		--salt $$(openssl rand -hex 32) \
  		--inclusion-fee 200 \
  		-- \
  		--admin $(shell stellar keys address $(admin)) \
  		> .stellar/boscora_oracle_id-$(network)
	@echo "Oracle deployed at: $$(cat .stellar/boscora_oracle_id-$(network))"
	@echo "Deploying NFT Contract..."
	stellar contract deploy \
  		--wasm $(wasm) \
  		--source-account $(admin) \
  		--network $(network) \
  		--salt $$(openssl rand -hex 32) \
  		--inclusion-fee 200 \
  		-- \
  		--admin $(shell stellar keys address $(admin)) \
  		--oracle $$(cat .stellar/boscora_oracle_id-$(network)) \
  		--max_parcels 500 \
  		> .stellar/boscora_nft_id-$(network)
	@echo "NFT deployed at: $$(cat .stellar/boscora_nft_id-$(network))"


# --------- Testnet --------- #

testnet_reset:  ## Playbook for testnet reset
	make funds && \
	make contract_bindings && \
	make contract_deploy

# Quick help
help:
	@echo "Available commands:"
	@echo "  make dapp           - Run dapp dev server"
	@echo "  make dapp_install   - Install dapp dependencies"
	@echo "  make prepare        - Prepare network and generate addresses and add funds"
	@echo "  make funds          - Add funds to accounts"
	@echo "  make contract_build - Build the contract"
	@echo "  make contract_test  - Run unit tests"
	@echo "  make clean          - Remove build artifacts"
	@echo "  make testnet_reset  - Playbook for testnet reset"
	@echo "  make help           - Show this help message"