import {
    type Action,
    composeContext,
    generateObjectDeprecated,
    type HandlerCallback,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { initWalletProvider, type WalletProvider } from "../providers/wallet";
import { swapIcyToBtcTemplate } from "../templates";
import { IcySwapService, TokenService } from "../services";
import { SwapIcyToBtcParams, CheckBalanceParams } from "../types";

// Minimum ICY amount required for swapping
const MIN_ICY_AMOUNT = 20;

export class SwapIcyToBtcAction {
    constructor(
        private icySwapService: IcySwapService,
        private tokenService: TokenService
    ) {}

    async checkERC20Balance(params: CheckBalanceParams) {
        return this.tokenService.checkERC20Balance(params);
    }
}

// Logic to build swap details from user input
const buildSwapIcyToBtcDetails = async (
    state: State,
    runtime: IAgentRuntime
): Promise<SwapIcyToBtcParams> => {
    // Generate parameters using LLM
    const context = composeContext({
        state,
        template: swapIcyToBtcTemplate,
    });

    const swapDetails = (await generateObjectDeprecated({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
    })) as SwapIcyToBtcParams;

    console.log(
        `Swap ${swapDetails.icyAmount} ICY tokens to BTC at address ${swapDetails.btcAddress}`
    );

    // Validate BTC address (basic validation)
    if (!swapDetails.btcAddress || swapDetails.btcAddress.trim() === "") {
        throw new Error(
            "Invalid BTC address. Please provide a valid Bitcoin address."
        );
    }

    // Validate ICY amount (basic validation)
    if (
        !swapDetails.icyAmount ||
        isNaN(Number(swapDetails.icyAmount)) ||
        Number(swapDetails.icyAmount) <= 0
    ) {
        throw new Error(
            "Invalid ICY amount. Please provide a valid positive number."
        );
    }

    return swapDetails;
};

export const swapIcyToBtcAction: Action = {
    name: "swapIcyToBtc",
    description: "Swap ICY tokens to BTC using the IcyBtcSwap contract",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback?: HandlerCallback
    ) => {
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        console.log("Swap ICY to BTC action handler called");
        const walletProvider = await initWalletProvider(runtime);
        const icySwapService = new IcySwapService(walletProvider);
        const tokenService = new TokenService(walletProvider);
        const action = new SwapIcyToBtcAction(icySwapService, tokenService);

        // Get the user's wallet address
        const walletAddress = runtime.walletAddress;

        // Get the ICY token address from the swap service
        const icyTokenAddress = "0x5233E10cc24736F107fEda42ff0157e91Cf1F8b6";

        try {
            // Check user's ICY balance first using the provided service method
            const tokenBalanceInfo = await action.checkERC20Balance({
                chain: "baseSepolia",
                tokenAddress: icyTokenAddress,
                walletAddress: walletAddress,
            });

            const balanceNum = Number(tokenBalanceInfo.balance);

            // Compose swap details context
            const paramOptions = await buildSwapIcyToBtcDetails(state, runtime);

            console.log("params", paramOptions);

            // Check minimum amount requirement
            if (Number(paramOptions.icyAmount) < MIN_ICY_AMOUNT) {
                if (callback) {
                    callback({
                        text: `Minimum ICY amount to swap is ${MIN_ICY_AMOUNT} ${tokenBalanceInfo.symbol}`,
                        content: {
                            success: false,
                            error: "INSUFFICIENT_BALANCE",
                            minimumRequired: MIN_ICY_AMOUNT,
                            currentBalance: balanceNum,
                            tokenSymbol: tokenBalanceInfo.symbol,
                            tokenName: tokenBalanceInfo.tokenName,
                        },
                    });
                }
                return false;
            }

            // Ensure the user is not trying to swap more than they have
            if (Number(paramOptions.icyAmount) > balanceNum) {
                if (callback) {
                    callback({
                        text: `You requested to swap ${
                            paramOptions.icyAmount
                        } ${
                            tokenBalanceInfo.symbol
                        }, but you only have ${balanceNum.toFixed(2)} ${
                            tokenBalanceInfo.symbol
                        } in your wallet. Please adjust the amount.`,
                        content: {
                            success: false,
                            error: "AMOUNT_EXCEEDS_BALANCE",
                            requestedAmount: Number(paramOptions.icyAmount),
                            currentBalance: balanceNum,
                            tokenSymbol: tokenBalanceInfo.symbol,
                            tokenName: tokenBalanceInfo.tokenName,
                        },
                    });
                }
                return false;
            }

            // Get swap info to show exchange rate
            const swapInfo = await icySwapService.getSwapInfo();
            const estimatedSatoshiAmount = icySwapService.calculateIcyToSatoshi(
                paramOptions.icyAmount,
                swapInfo.data.icy_satoshi_rate
            );
            paramOptions.satoshiAmount = estimatedSatoshiAmount;

            const signatureResponse =
                await icySwapService.generateSwapSignature(
                    paramOptions.btcAddress,
                    paramOptions.icyAmount,
                    paramOptions.satoshiAmount
                );

            const txApprove = await icySwapService.buildApproveTokenTx(
                signatureResponse.data.icy_amount,
                walletAddress
            );

            const txSwap = await icySwapService.buildSwapTokenTx(
                {
                    icyAmount: signatureResponse.data.icy_amount,
                    btcAddress: paramOptions.btcAddress,
                    btcAmount: signatureResponse.data.btc_amount,
                    nonce: signatureResponse.data.nonce,
                    deadline: signatureResponse.data.deadline,
                    signature: signatureResponse.data.signature,
                },
                walletAddress
            );

            const transactions = [txApprove, txSwap];

            if (callback) {
                callback({
                    text: `Prepared swap transaction of ${
                        paramOptions.icyAmount
                    } ICY tokens to approximately ${Number(
                        Number(estimatedSatoshiAmount) -
                            Number(swapInfo.data.min_satoshi_fee)
                    )} Satoshi. The BTC will be sent to ${
                        paramOptions.btcAddress
                    } after you approve and sign the transactions.`,
                    content: {
                        success: true,
                        transactions: transactions,
                        type: "SWAP_ICY",
                    },
                });
            }
            return true;
        } catch (error) {
            console.error("Error preparing ICY to BTC swap:", error);
            if (callback) {
                callback({
                    text: `Sorry ser, I can't execute your query. Please try again`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    validate: async (_runtime: IAgentRuntime) => {
        return true
    },
    examples: [
        [
            {
                user: "assistant",
                content: {
                    text: "I'll swap your ICY tokens to BTC",
                    action: "SWAP_ICY_TO_BTC",
                },
            },
            {
                user: "user",
                content: {
                    text: "I want to swap 10 ICY to BTC. My bitcoin address is bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
                    action: "SWAP_ICY_TO_BTC",
                },
            },
        ],
        [
            {
                user: "assistant",
                content: {
                    text: "I'll help you swap ICY tokens for Bitcoin",
                    action: "SWAP_ICY_TO_BTC",
                },
            },
            {
                user: "user",
                content: {
                    text: "Can you swap 5.5 ICY to my Bitcoin address 3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy?",
                    action: "SWAP_ICY_TO_BTC",
                },
            },
        ],
        [
            {
                user: "assistant",
                content: {
                    text: "I'll initiate an ICY to BTC swap for you",
                    action: "SWAP_ICY_TO_BTC",
                },
            },
            {
                user: "user",
                content: {
                    text: "Please exchange my ICY tokens for Bitcoin. I need to swap 2.75 ICY to bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
                    action: "SWAP_ICY_TO_BTC",
                },
            },
        ],
        [
            {
                user: "assistant",
                content: {
                    text: "I'll initiate an ICY to BTC swap for you",
                    action: "SWAP_ICY_TO_BTC",
                },
            },
            {
                user: "user",
                content: {
                    text: "swap 20 icy to btc address tb1qf06am7xd4tpmnuuw92rgtr48jzq84vr3ykp9hd",
                    action: "SWAP_ICY_TO_BTC",
                },
            },
        ],
    ],
    similes: ["SWAP_ICY", "EXCHANGE_ICY", "ICY_TO_BTC", "CONVERT_ICY"],
};
