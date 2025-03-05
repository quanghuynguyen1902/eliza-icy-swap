import { parseUnits, erc20Abi } from "viem";
import axios from 'axios';
import { IcySwapInfoResponse, IcySwapSignatureRequest, IcySwapSignatureResponse, SupportedChain } from "../types";
import { type WalletProvider } from "../providers/wallet";

// ABI for the IcyBtcSwap contract (including only the swap function)
const icySwapABI = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "icyAmount", "type": "uint256"},
            {"internalType": "string", "name": "btcAddress", "type": "string"},
            {"internalType": "uint256", "name": "btcAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "nonce", "type": "uint256"},
            {"internalType": "uint256", "name": "deadline", "type": "uint256"},
            {"internalType": "bytes", "name": "_signature", "type": "bytes"}
        ],
        "name": "swap",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;


// Define a class for swap-related operations
export class IcySwapService {
    private readonly icySwapInfoApiUrl = 'https://develop-backend.icy.so/api/v1/swap/info';
    private readonly icySwapSignatureApiUrl = 'https://develop-backend.icy.so/api/v1/swap/generate-signature';
    private readonly icySwapContractAddress = '0x175c2adA4a0b1AC1cc9717F4E47b6868332bad76'; // Replace with actual address
    private readonly icyTokenAddress = '0x5233E10cc24736F107fEda42ff0157e91Cf1F8b6'; // Replace with actual ICY token address
    private readonly chain = "baseSepolia" as SupportedChain; // Replace with your target chain (e.g., 'ethereum', 'sepolia', etc.)

    constructor(private walletProvider: WalletProvider) {}

    /**
     * Fetches swap information from the API
     * @returns Promise with swap information
     */
    async getSwapInfo(): Promise<IcySwapInfoResponse> {
        try {
            const response = await axios.get<IcySwapInfoResponse>(`${this.icySwapInfoApiUrl}`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to fetch swap info: ${error.response?.data?.message || error.message}`);
            }
            throw new Error(`Failed to fetch swap info: ${(error as Error).message}`);
        }
    }

    /**
     * Calculates the equivalent amount of Satoshi for a given ICY amount
     * @param icyAmount The amount of ICY tokens
     * @returns The equivalent amount in Satoshi
     */
    async calculateIcyToSatoshi(icyAmount: string, icy_satoshi_rate: string): Promise<string> {
        // Calculate satoshi amount using the new formula
        const satoshiAmount = Number(icyAmount) * Number(icy_satoshi_rate);
        return satoshiAmount.toString();
    }

    /**
     * Generates a signature for a swap transaction
     * @param btcAddress Bitcoin address for the swap
     * @param icyAmount The amount of ICY tokens
     * @param btcAmount The amount of BTC in satoshi (optional)
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
                btc_amount: satoshiAmount
            };

            const response = await axios.post<IcySwapSignatureResponse>(
                this.icySwapSignatureApiUrl,
                requestData
            );

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to generate swap signature: ${error.response?.data?.error}`);
            }
            throw new Error(`Failed to generate swap signature: ${(error as Error).message}`);
        }
    }

    /**
     * Executes a swap of ICY tokens to BTC using the IcyBtcSwap contract
     * @param btcAddress Bitcoin address to receive BTC
     * @param icyAmount Amount of ICY tokens to swap (as a string in human-readable format)
     * @returns Transaction hash
     */
    async swapIcyToBtc(
        btcAddress: string,
        icyAmount: string,
        satoshiAmount: string
    ): Promise<`0x${string}`> {
        try {
            // Switch to the correct chain
            this.walletProvider.switchChain(this.chain);
            const walletClient = this.walletProvider.getWalletClient(this.chain);
            const publicClient = this.walletProvider.getPublicClient(this.chain);

            const walletAddress = this.walletProvider.getAddress() as `0x${string}`;

            // Get swap signature from backend
            const signatureResponse = await this.generateSwapSignature(
                btcAddress,
                icyAmount,
                satoshiAmount
            );

            //Extract data from signature response
            const {
                data: {
                    icy_amount,
                    btc_amount,
                    nonce,
                    deadline,
                    signature
                }
            } = signatureResponse;

            // check token allowance
            let currentAllowance = BigInt(0)
            currentAllowance = await publicClient.readContract({
                account: walletAddress,
                address: this.icyTokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: "allowance",
                args: [
                    walletAddress,
                    this.icySwapContractAddress as `0x${string}`
                ]
            });

            // Check if current allowance is sufficient
            if (currentAllowance >= BigInt(icy_amount)) {
                console.log("Allowance is already sufficient:", currentAllowance.toString());
            } else {
                const { result, request } = await publicClient.simulateContract({
                    account: walletClient.account,
                    address: this.icyTokenAddress as `0x${string}`,
                    abi: erc20Abi,
                    functionName: "approve",
                    args: [this.icySwapContractAddress as `0x${string}`, BigInt(icy_amount)],
                });
                if (!result) {
                    throw new Error("Approve failed");
                }
                //First approve the IcyBtcSwap contract to spend ICY tokens
                const approveTx = await walletClient.writeContract(request);
                await publicClient.waitForTransactionReceipt({ hash: approveTx });
            }

            const { result: swapResult, request: swapRequest} = await publicClient.simulateContract({
                account: walletClient.account,
                address: this.icySwapContractAddress as `0x${string}`,
                abi: icySwapABI,
                functionName: "swap",
                args: [
                    BigInt(icy_amount),
                    btcAddress,
                    BigInt(btc_amount),
                    BigInt(nonce),
                    BigInt(deadline),
                    `0x${signature}`
                ]
            });

            // Now execute the swap
            const swapTx = await walletClient.writeContract(swapRequest);
            console.log(swapTx)
            return swapTx;

        } catch (error) {
            throw new Error(`Failed to swap ICY to BTC: ${(error as Error).message}`);
        }
    }
}
