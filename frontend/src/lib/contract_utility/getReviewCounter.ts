import FlickShareAbi from "@/abi/FlickShareContract.json"; // make sure ABI is imported
import client from "../worldClient";
import { ENV_VARIABLES } from "@/constants/env_variables";



// 2️⃣ Utility function to get reviewCounter
export async function getReviewCounter() {
  const counter = await client.readContract({
    address: ENV_VARIABLES.FLICKSHARE_CONTRACT_ADDRESS as `0x${string}`,
    abi: FlickShareAbi,
    functionName: "reviewCounter",
  });
  console.log("Wowowow");
  console.log(counter);
  
  return Number(counter); // convert BigInt to number
}
