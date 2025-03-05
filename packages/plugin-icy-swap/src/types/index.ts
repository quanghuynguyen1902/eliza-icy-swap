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
    decimals: number;
    tokenAddress: string;
}

export interface CheckBalanceParams {
    chain: SupportedChain;
    tokenAddress: `0x${string}`; // Contract address of the ERC20 token
}

export interface IcySwapInfo {
    circulated_icy_balance: string;
    icy_satoshi_rate: string;
    icy_usd_rate: string;
    min_icy_to_swap: string;
    min_satoshi_fee: string;
    satoshi_balance: string;
    satoshi_per_usd: number;
    satoshi_usd_rate: string;
    service_fee_rate: number;
}

export interface IcySwapInfoResponse {
    data: IcySwapInfo;
    message: string;
}

// New interface for signature generation request
export interface IcySwapSignatureRequest {
    btc_address: string;
    icy_amount: string;
    btc_amount: string;
}

// New interface for signature generation response
export interface IcySwapSignatureResponse {
    data: {
        btc_amount: string;
        deadline: string;
        icy_amount: string;
        nonce: string;
        signature: string;
    };
    message: string;
}

export interface SwapIcyToBtcParams {
    btcAddress: string;
    icyAmount: string;
    satoshiAmount?: string;
}
