export * from "./actions/check-balance";
export * from "./actions/swap.ts";
export * from "./providers/wallet";
export * from "./types";

import type { Plugin } from "@elizaos/core";
import { checkBalanceAction } from "./actions/check-balance";
import { swapIcyToBtcAction } from './actions/swap';
import { evmWalletProvider } from "./providers/wallet";

export const icySwapPlugin: Plugin = {
    name: "icy",
    description: "EVM blockchain integration plugin",
    providers: [evmWalletProvider],
    evaluators: [],
    services: [],
    actions: [checkBalanceAction, swapIcyToBtcAction],
};

export default icySwapPlugin;
