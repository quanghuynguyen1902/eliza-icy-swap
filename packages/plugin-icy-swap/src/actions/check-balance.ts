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
import { checkBalanceTemplate } from "../templates";
import { TokenService } from "../services";
import { CheckBalanceParams } from "../types";

export class CheckERC20BalanceAction {
    constructor(private tokenService: TokenService) {}

    async checkERC20Balance(params: CheckBalanceParams) {
        return this.tokenService.checkERC20Balance(params);
    }
}

const buildCheckBalanceDetails = async (
    state: State,
    runtime: IAgentRuntime,
    wp: WalletProvider,
): Promise<CheckBalanceParams> => {
    const chains = Object.keys(wp.chains);
    state.supportedChains = chains.map((item) => `"${item}"`).join("|");

    // Generate parameters using LLM
    const context = composeContext({
        state,
        template: checkBalanceTemplate,
    });

    const checkBalanceDetails = (await generateObjectDeprecated({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
    })) as CheckBalanceParams;

    console.log(`Check balance for token ${checkBalanceDetails.tokenAddress} on chain ${checkBalanceDetails.chain}`);

    const existingChain = wp.chains[checkBalanceDetails.chain];

    if (!existingChain) {
        throw new Error(
            "The chain " +
            checkBalanceDetails.chain +
            " not configured yet. Add the chain or choose one from configured: " +
            chains.toString()
        );
    }

    return checkBalanceDetails;
};

export const checkBalanceAction: Action = {
    name: "checkBalance",
    description: "Check the balance of an token on a specific chain",
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

        console.log("Check balance action handler called");
        const walletProvider = await initWalletProvider(runtime);
        const tokenService = new TokenService(walletProvider);
        const action = new CheckERC20BalanceAction(tokenService);

        // Compose check balance context
        const paramOptions = await buildCheckBalanceDetails(
            state,
            runtime,
            walletProvider
        );

        try {
            const balanceInfo = await action.checkERC20Balance(paramOptions);
            const walletAddress = walletProvider.getAddress();

            if (callback) {
                callback({
                    text: `Your wallet (${walletAddress}) has a balance of ${balanceInfo.balance} ${balanceInfo.symbol} (${balanceInfo.tokenName}) on ${balanceInfo.chain}`,
                    content: {
                        success: true,
                        address: walletAddress,
                        balance: balanceInfo.balance,
                        symbol: balanceInfo.symbol,
                        tokenName: balanceInfo.tokenName,
                        chain: balanceInfo.chain,
                        chainId: balanceInfo.chainId,
                        tokenAddress: balanceInfo.tokenAddress
                    },
                });
            }
            return true;
        } catch (error) {
            console.error("Error checking balance:", error);
            if (callback) {
                callback({
                    text: `Error checking token balance: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "assistant",
                content: {
                    text: "I'll check your USDC balance on Base Sepolia",
                    action: "CHECK_BALANCE",
                },
            },
            {
                user: "user",
                content: {
                    text: "What's my USDC balance on baseSepolia?",
                    action: "CHECK_BALANCE",
                },
            },
        ],
        [
            {
                user: "assistant",
                content: {
                    text: "I'll check your token balance",
                    action: "CHECK_BALANCE",
                },
            },
            {
                user: "user",
                content: {
                    text: "Show me my DAI token balance on Ethereum",
                    action: "CHECK_BALANCE",
                },
            },
        ],
        [
            {
                user: "assistant",
                content: {
                    text: "I'll check the balance of that token",
                    action: "CHECK_BALANCE",
                },
            },
            {
                user: "user",
                content: {
                    text: "Can you check my balance for token 0x4200000000000000000000000000000000000006 on base-sepolia?",
                    action: "CHECK_BALANCE",
                },
            },
        ],
    ],
    similes: ["CHECK_TOKEN_BALANCE", "GET_BALANCE", "TOKEN_BALANCE", "BALANCE"],
};
