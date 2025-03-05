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

export const swapIcyToBtcTemplate = `
You are an AI assistant helping to extract parameters for an ICY to BTC swap.

First, review the recent messages from the conversation:

<recent_messages>
{{recentMessages}}
</recent_messages>

Here's a list of supported chains:
<supported_chains>
{{supportedChains}}
</supported_chains>

The user wants to swap ICY tokens to BTC on baseSepolia.

Extract the following information from the user's message:
1. The Bitcoin address (btcAddress) where they want to receive BTC
2. The amount of ICY tokens (icyAmount) they want to swap

Respond with a JSON object in the following format:
{
  "btcAddress": "bitcoin address extracted from the message",
  "icyAmount": "amount of ICY tokens to swap as a string"
}

If any information is missing, you should use reasonable defaults or ask for clarification.
For Bitcoin addresses, there is no reasonable default - the user must provide a valid BTC address.
For ICY amount, if not specified, you can default to "1" for 1 ICY token.
For ICY or icy on base-sepolia, token address is: 0x5233E10cc24736F107fEda42ff0157e91Cf1F8b6

Example user messages and corresponding outputs:
User: "Swap 10 ICY to my BTC address bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
Output: {"btcAddress": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", "icyAmount": "10"}

User: "Exchange 5.5 ICY tokens for Bitcoin at 3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"
Output: {"btcAddress": "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy", "icyAmount": "5.5"}

User: "Send some ICY to my BTC wallet 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
Output: {"btcAddress": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "icyAmount": "1"}

User: "swap 20 icy to btc address tb1qf06am7xd4tpmnuuw92rgtr48jzq84vr3ykp9hd"
Output: {"btcAddress": "tb1qf06am7xd4tpmnuuw92rgtr48jzq84vr3ykp9hd", "icyAmount": "20"}

User message to extract information from:
{text}
`;
