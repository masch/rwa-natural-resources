import * as Client from "../../packages/boscora-nft/dist";
import { assertEnv } from "../utils/envAssert";

assertEnv();

export default new Client.Client({
  networkPassphrase: import.meta.env.PUBLIC_SOROBAN_NETWORK_PASSPHRASE,
  contractId: import.meta.env.PUBLIC_BOSCORA_NFT_CONTRACT_ID,
  rpcUrl: import.meta.env.PUBLIC_SOROBAN_RPC_URL,
  // Allow insecure HTTP connections only in development to prevent MITM attacks in production
  allowHttp: import.meta.env.DEV,
});
