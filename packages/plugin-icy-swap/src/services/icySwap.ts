import { parseUnits, erc20Abi, encodeFunctionData } from "viem";
import axios from "axios";
import { type WalletProvider } from "../providers/wallet";
import {
    IcySwapInfoResponse,
    IcySwapSignatureRequest,
    IcySwapSignatureResponse,
    SupportedChain,
} from "../types";

// ABI for IcyBtcSwap contract swap function
const icySwapABI = [
    {
        inputs: [
            { internalType: "uint256", name: "icyAmount", type: "uint256" },
            { internalType: "string", name: "btcAddress", type: "string" },
            { internalType: "uint256", name: "btcAmount", type: "uint256" },
            { internalType: "uint256", name: "nonce", type: "uint256" },
            { internalType: "uint256", name: "deadline", type: "uint256" },
            { internalType: "bytes", name: "_signature", type: "bytes" },
        ],
        name: "swap",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;

export class IcySwapService {
    private readonly icySwapInfoApiUrl =
        "https://develop-backend.icy.so/api/v1/swap/info";
    private readonly icySwapSignatureApiUrl =
        "https://develop-backend.icy.so/api/v1/swap/generate-signature";
    private readonly icySwapContractAddress =
        "0x175c2adA4a0b1AC1cc9717F4E47b6868332bad76";
    private readonly icyTokenAddress =
        "0x5233E10cc24736F107fEda42ff0157e91Cf1F8b6";
    private readonly chain = "baseSepolia" as SupportedChain;

    constructor(private walletProvider: WalletProvider) {}

    /**
     * Fetches swap information from the API
     * @returns Promise with swap information
     */
    async getSwapInfo(): Promise<IcySwapInfoResponse> {
        try {
            const response = await axios.get<IcySwapInfoResponse>(
                `${this.icySwapInfoApiUrl}`
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(
                    `Failed to fetch swap info: ${
                        error.response?.data?.message || error.message
                    }`
                );
            }
            throw new Error(
                `Failed to fetch swap info: ${(error as Error).message}`
            );
        }
    }

    /**
     * Calculates the equivalent amount of Satoshi for a given ICY amount
     * @param icyAmount The amount of ICY tokens
     * @param icySatoshiRate The conversion rate between ICY and satoshi
     * @returns The equivalent amount in Satoshi
     */
    calculateIcyToSatoshi(icyAmount: string, icySatoshiRate: string): string {
        const satoshiAmount = Number(icyAmount) * Number(icySatoshiRate);
        return satoshiAmount.toString();
    }

    /**
     * Generates a signature for a swap transaction
     * @param btcAddress Bitcoin address for the swap
     * @param icyAmount The amount of ICY tokens
     * @param satoshiAmount The amount of BTC in satoshi
     * @returns Promise with the signature response
     */
    async generateSwapSignature(
        btcAddress: string,
        icyAmount: string,
        satoshiAmount: string
    ): Promise<IcySwapSignatureResponse> {
        try {
            const requestData: IcySwapSignatureRequest = {
                btc_address: btcAddress,
                icy_amount: parseUnits(icyAmount, 18).toString(),
                btc_amount: satoshiAmount,
            };

            const response = await axios.post<IcySwapSignatureResponse>(
                this.icySwapSignatureApiUrl,
                requestData
            );

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(
                    `Failed to generate swap signature: ${
                        error.response?.data?.error || error.message
                    }`
                );
            }
            throw new Error(
                `Failed to generate swap signature: ${(error as Error).message}`
            );
        }
    }

    /**
     * Build transaction data for token approval
     * @param amount Amount of tokens to approve (string, in token units)
     * @param walletAddress User's wallet address
     * @returns Transaction data and complete information about the approval transaction
     */
    async buildApproveTokenTx(amount: string, walletAddress: string) {
        try {
            const publicClient = this.walletProvider.getPublicClient(
                this.chain
            );

            // Create transaction data for approve
            const txData = encodeFunctionData({
                abi: erc20Abi,
                functionName: "approve",
                args: [
                    this.icySwapContractAddress as `0x${string}`,
                    BigInt(amount),
                ],
            });

            // Get gas information from the chain
            const gasEstimate = await publicClient.estimateGas({
                account: walletAddress as `0x${string}`,
                to: this.icyTokenAddress as `0x${string}`,
                data: txData,
            });

            // Get current gas price
            const gasPrice = await publicClient.getGasPrice();

            // Return complete transaction information
            return {
                from: walletAddress,
                to: this.icyTokenAddress,
                data: txData,
                value: "0x0", // No ETH is sent with this transaction
                gas: gasEstimate.toString(),
                chainId: await publicClient.getChainId(),
            };
        } catch (error) {
            throw new Error(
                `Failed to build approve token transaction: ${
                    (error as Error).message
                }`
            );
        }
    }

    /**
     * Build transaction data for token swap
     * @param swapParams Parameters for the swap
     * @param walletAddress User's wallet address
     * @returns Transaction data and complete information about the swap transaction
     */
    async buildSwapTokenTx(
        swapParams: {
            icyAmount: string;
            btcAddress: string;
            btcAmount: string;
            nonce: string;
            deadline: string;
            signature: string;
        },
        walletAddress: string
    ) {
        try {
            const publicClient = this.walletProvider.getPublicClient(
                this.chain
            );

            // Create transaction data for swap
            const txData = encodeFunctionData({
                abi: icySwapABI,
                functionName: "swap",
                args: [
                    BigInt(swapParams.icyAmount),
                    swapParams.btcAddress,
                    BigInt(swapParams.btcAmount),
                    BigInt(swapParams.nonce),
                    BigInt(swapParams.deadline),
                    `0x${swapParams.signature}` as `0x${string}`,
                ],
            });

            // Get gas information from the chain
            const gasEstimate = BigInt("40000");

            // Return complete transaction information
            return {
                from: walletAddress,
                to: this.icySwapContractAddress,
                data: txData,
                value: "0x0", // No ETH is sent with this transaction
                gas: gasEstimate.toString(),
                chainId: await publicClient.getChainId(),
            };
        } catch (error) {
            throw new Error(
                `Failed to build swap token transaction: ${
                    (error as Error).message
                }`
            );
        }
    }
}
