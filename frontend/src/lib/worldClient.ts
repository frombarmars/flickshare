import { createPublicClient, http } from "viem";
import { worldchain } from "viem/chains";

const client = createPublicClient({
    chain: worldchain,
    transport: http("https://worldchain-mainnet.g.alchemy.com/public"),
});


export default client;