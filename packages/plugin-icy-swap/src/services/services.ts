import { formatUnits } from "viem";
import { TokenBalance, SupportedChain } from "../types";
import { type WalletProvider } from "../providers/wallet";

// Define params interface for the check ERC20 balance action
export interface CheckBalanceParams {
    chain: SupportedChain;
    tokenAddress: `0x${string}`; // Contract address of the ERC20 token
}

// ABI for ERC20 balanceOf function
const erc20ABI = [
    {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "name": "", "type": "uint8" }],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [{ "name": "", "type": "string" }],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [{ "name": "", "type": "string" }],
        "type": "function"
    }
] as const;


export class TokenService {
    constructor(private walletProvider: WalletProvider) {}

    async checkERC20Balance(params: CheckBalanceParams): Promise<TokenBalance> {
        this.walletProvider.switchChain(params.chain);
        const publicClient = this.walletProvider.getPublicClient(params.chain);
        const chain = this.walletProvider.getCurrentChain();
        console.log(params.tokenAddress);
        const walletAddress = this.walletProvider.getAddress();

        try {
            // Get token decimals
            const decimals = await publicClient.readContract({
                address: params.tokenAddress,
                abi: erc20ABI,
                functionName: 'decimals'
            });

            // Get token balance
            const balanceResult = await publicClient.readContract({
                address: params.tokenAddress,
                abi: erc20ABI,
                functionName: 'balanceOf',
                args: [walletAddress]
            });
            const balance = BigInt(balanceResult as number);

            // Get token symbol
            const symbol = await publicClient.readContract({
                address: params.tokenAddress,
                abi: erc20ABI,
                functionName: 'symbol'
            });

            // Get token name
            const name = await publicClient.readContract({
                address: params.tokenAddress,
                abi: erc20ABI,
                functionName: 'name'
            });

            // Format the balance according to token decimals
            const formattedBalance = formatUnits(balance, decimals as number);

            return {
                balance: formattedBalance,
                symbol: symbol as string,
                tokenName: name as string,
                chain: params.chain,
                chainId: chain.id,
                tokenAddress: params.tokenAddress
            };
        } catch (error) {
            throw new Error(`balance check failed: ${error.message}`);
        }
    }
}
