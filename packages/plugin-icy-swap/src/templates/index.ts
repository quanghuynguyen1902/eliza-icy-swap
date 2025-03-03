export const checkBalanceTemplate = `
You need to help determine which token name and chain name to use for checking token balance.

First, review the recent messages from the conversation:

<recent_messages>
{{recentMessages}}
</recent_messages>

Here's a list of supported chains:
<supported_chains>
{{supportedChains}}
</supported_chains>


Use the user's message: "{{userMessage}}" to determine:
1. What token name to check
2. What chain name to check

If the user doesn't specify a chain, try to infer it from the token name, or default to "baseSepolia".
If the user doesn't specify a token name, but mentions a common token address:
- For USDC or usdc on base-sepolia, token address is 0x036CbD53842c5426634e7929541eC2318f3dCF7e
- For WETH or weth on base-sepolia, token address is 0x4200000000000000000000000000000000000006
- For ICY or icy on base-sepolia, token address is: 0x5233E10cc24736F107fEda42ff0157e91Cf1F8b6
- For DAI or dai on Ethereum mainnet, use: 0x6B175474E89094C44Da98b954EedeAC495271d0F


Output JSON with "chain" and "tokenAddress" fields.
`;

export const swapIcyToBtcTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested swap from ICY to BTC:
- Amount of ICY to swap (must be a string representing the number without any currency symbol)
- Chain where the swap should be executed
- Destination BTC address

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "inputToken": "ICY",
    "outputToken": "BTC",
    "amount": string | null,
    "chain": "ethereum" | "base" | "sepolia" | "bsc" | "arbitrum" | "avalanche" | "polygon" | "optimism" | "cronos" | "gnosis" | "fantom" | "klaytn" | "celo" | "moonbeam" | "aurora" | "harmonyOne" | "moonriver" | "arbitrumNova" | "mantle" | "linea" | "scroll" | "filecoin" | "taiko" | "zksync" | "canto" | "bitcoin" | null,
    "toAddress": string | null
}
\`\`\`
`;
