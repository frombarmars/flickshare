import { customAlphabet } from "nanoid";


function generateReferralCode() : string {
    const nanoid = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);
    const code = nanoid(); // e.g. "8G4K2W9Z"
    return code;
}
export { generateReferralCode };