import NFTContractAbi from "@/abi/NFTContract.json"; // make sure ABI is imported
import client from "../worldClient";
import { ENV_VARIABLES } from "@/constants/env_variables";
import { INFTMetadata } from "@/types/interfaces/INFTMetadata";



// 2️⃣ Utility function to get reviewCounter
export async function getUserMintedNFT(tokenId: number): Promise<INFTMetadata | null> {
    if (tokenId && tokenId > 0) {
        const tokenURI: string = await client.readContract({
            address: ENV_VARIABLES.NFT_CONTRACT_ADDRESS as `0x${string}`,
            abi: NFTContractAbi,
            functionName: "tokenURI",
            args: [tokenId],
        }) as string;

        // Fetch metadata from the tokenURI
        try {
            const response = await fetch(tokenURI);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const metadata: INFTMetadata = await response.json();
            return metadata;
        } catch (error) {
            return null;
        }
    }
    return null;
}


export async function isUserMintedNFT(userWalletAddress: string): Promise<number> {
    const tokenId: number = await client.readContract({
        address: ENV_VARIABLES.NFT_CONTRACT_ADDRESS as `0x${string}`,
        abi: NFTContractAbi,
        functionName: "hasMinted",
        args: [userWalletAddress as `0x${string}`],
    }) as number;
    return tokenId;
}


export async function checkHowManyUsersMintedNFT(): Promise<number> {
    const userCount: number = await client.readContract({
        address: ENV_VARIABLES.NFT_CONTRACT_ADDRESS as `0x${string}`,
        abi: NFTContractAbi,
        functionName: "totalMinted",
    }) as number;
    return userCount;
}