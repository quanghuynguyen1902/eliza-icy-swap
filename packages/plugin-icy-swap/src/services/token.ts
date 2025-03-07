import { formatUnits, erc20Abi } from "viem";
import { TokenBalance, CheckBalanceParams } from "../types";
import { type WalletProvider } from "../providers/wallet";


export class TokenService {
    constructor(private walletProvider: WalletProvider) {}

    async checkERC20Balance(params: CheckBalanceParams): Promise<TokenBalance> {
        this.walletProvider.switchChain(params.chain);
        const publicClient = this.walletProvider.getPublicClient(params.chain);
        const chain = this.walletProvider.getCurrentChain();

        // Use walletAddress from params instead of getting it from walletProvider
        const walletAddress = params.walletAddress;

        try {
            // Get token decimals
            const decimals = await publicClient.readContract({
                address: params.tokenAddress,
                abi: erc20Abi,
                functionName: 'decimals'
            });

            // Get token balance
            const balanceResult = await publicClient.readContract({
                address: params.tokenAddress,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [walletAddress as `0x${string}`],
            });

            // Get token symbol
            const symbol = await publicClient.readContract({
                address: params.tokenAddress,
                abi: erc20Abi,
                functionName: 'symbol'
            });

            // Get token name
            const name = await publicClient.readContract({
                address: params.tokenAddress,
                abi: erc20Abi,
                functionName: 'name'
            });

            // Format the balance according to token decimals
            const formattedBalance = formatUnits(balanceResult, decimals as number);

            return {
                balance: formattedBalance,
                symbol: symbol as string,
                tokenName: name as string,
                chain: params.chain,
                chainId: chain.id,
                decimals: decimals as number,
                tokenAddress: params.tokenAddress,
            };
        } catch (error) {
            throw new Error(`balance check failed: ${error.message}`);
        }
    }
}
