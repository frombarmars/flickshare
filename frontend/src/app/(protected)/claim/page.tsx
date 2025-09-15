"use client";
import { useState, useEffect } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { Gift, CheckCircle, XCircle, Loader } from "lucide-react";
import FlickShareContractABI from "@/abi/FlickShareContract.json";
import { useWaitForTransactionReceipt } from "@worldcoin/minikit-react";
import client from "@/lib/worldClient";
import Image from "next/image";
import { ENV_VARIABLES } from "@/constants/env_variables";

export default function ClaimNFTPage() {
    const [transactionId, setTransactionId] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [nftClaimed, setNftClaimed] = useState(false);
    const [nftImage, setNftImage] = useState("/placeholder-nft.png"); // Default placeholder

    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({
            client,
            appConfig: {
                app_id: ENV_VARIABLES.WORLD_MINIAPP_ID,
            },
            transactionId,
        });

    useEffect(() => {
        if (isConfirmed) {
            setSuccessMessage("Congratulations! Your NFT has been claimed.");
            console.log(successMessage);
            setNftClaimed(true);
            // In a real app, you would fetch the actual NFT image here
            // For demo purposes, we'll use a placeholder
            setNftImage("/api/placeholder/300/400?text=Your+NFT");
        }
    }, [isConfirmed, successMessage]);

    const claimNFT = async () => {
        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
                transaction: [
                    {
                        address: ENV_VARIABLES.FLICKSHARE_CONTRACT_ADDRESS,
                        abi: FlickShareContractABI,
                        functionName: "claimNFT",
                        args: [],
                    },
                ],
            });

            if (finalPayload.status === "error") {
                setErrorMessage("NFT claim transaction failed. Please try again.");
            } else {
                setTransactionId(finalPayload.transaction_id);
            }
        } catch (err) {
            console.error(err);
            setErrorMessage("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="w-full min-h-screen bg-white text-gray-900 flex flex-col items-center px-4 py-6">
            <div className="w-full max-w-md">
                <h1 className="text-2xl font-bold mb-2 text-center">Claim Your Early User NFT</h1>
                <p className="text-gray-600 text-sm text-center mb-6">
                    Exclusive NFT for the first 1,000 FlickShare users
                </p>

                {!nftClaimed ? (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
                        <div className="flex items-center mb-5">
                            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mr-4">
                                <Gift className="w-6 h-6 text-white" strokeWidth={2} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-black">Early User NFT</h2>
                                <p className="text-gray-500 text-sm">Limited edition</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-start">
                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center mr-3 mt-0.5">
                                    <span className="text-xs font-bold">1</span>
                                </div>
                                <p className="text-gray-700 text-sm">Host mini movie watch parties</p>
                            </div>
                            <div className="flex items-start">
                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center mr-3 mt-0.5">
                                    <span className="text-xs font-bold">2</span>
                                </div>
                                <p className="text-gray-700 text-sm">Limited edition merch access</p>
                            </div>
                            <div className="flex items-start">
                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center mr-3 mt-0.5">
                                    <span className="text-xs font-bold">3</span>
                                </div>
                                <p className="text-gray-700 text-sm">Recognition as early supporter</p>
                            </div>
                        </div>

                        <div className="bg-gray-100 p-3 rounded-lg mb-6">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>NFTs claimed</span>
                                <span>423/1000</span>
                            </div>
                            <div className="w-full bg-gray-300 rounded-full h-2">
                                <div className="bg-black h-2 rounded-full" style={{ width: '42%' }}></div>
                            </div>
                        </div>

                        <button
                            onClick={claimNFT}
                            disabled={loading || isConfirming}
                            className="w-full bg-black text-white p-4 rounded-xl hover:bg-gray-800 active:bg-gray-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading || isConfirming ? (
                                <>
                                    <Loader className="w-5 h-5 animate-spin" />
                                    {isConfirming ? "Confirming..." : "Claiming NFT..."}
                                </>
                            ) : (
                                "Claim NFT"
                            )}
                        </button>

                        {errorMessage && (
                            <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-200 flex items-start">
                                <XCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
                                <p className="text-red-600 text-sm">{errorMessage}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
                        <div className="text-center mb-5">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-lg font-bold text-black">NFT Claimed Successfully!</h2>
                            <p className="text-gray-600 text-sm mt-1">Your exclusive Early User NFT</p>
                        </div>

                        <div className="border border-gray-200 rounded-xl overflow-hidden mb-5">
                            <Image
                                src={nftImage}
                                alt="Early User NFT"
                                className="w-full h-auto"
                                onError={(e) => {
                                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'%3E%3Crect width='300' height='400' fill='%23f0f0f0'/%3E%3Ctext x='150' y='200' font-family='Arial' font-size='18' text-anchor='middle' fill='%23333'%3EYour NFT%3C/text%3E%3C/svg%3E";
                                }}
                            />
                        </div>

                        <div className="bg-gray-100 p-4 rounded-xl mb-5">
                            <h3 className="font-medium text-black mb-2">Early User NFT #0423</h3>
                            <p className="text-sm text-gray-600">
                                This NFT proves you were among the first supporters of FlickShare and grants you exclusive benefits.
                            </p>
                        </div>
                    </div>
                )}

                <div className="text-center text-xs text-gray-500">
                    <p>By claiming, you agree to our Terms of Service</p>
                </div>
            </div>
        </main>
    );
}