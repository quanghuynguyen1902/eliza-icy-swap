import * as viemChains from "viem/chains";

const _SupportedChainList = Object.keys(viemChains) as Array<
    keyof typeof viemChains
>;
export type SupportedChain = (typeof _SupportedChainList)[number];

export interface TokenBalance {
    balance: string;
    symbol: string;
    tokenName: string;
    chain: string;
    chainId: number;
    tokenAddress: string;
}
