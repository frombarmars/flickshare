"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, LiveFeedback } from "@worldcoin/mini-apps-ui-kit-react";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { useSession } from "next-auth/react";

const VerifyPage = () => {
  const { data: session } = useSession();
  const userWalletAddress = session?.user?.walletAddress ?? "";
  const router = useRouter();
  const [buttonState, setButtonState] = useState<
    "pending" | "success" | "failed" | undefined
  >(undefined);

  const [whichVerification, setWhichVerification] =
    useState<VerificationLevel>(VerificationLevel.Orb);

  const onClickVerify = async () => {
    setButtonState("pending");
    setWhichVerification(VerificationLevel.Orb);

    try {
      const result = await MiniKit.commandsAsync.verify({
        action: "verify-action",
        verification_level: VerificationLevel.Orb,
        signal: userWalletAddress,
      });

      const response = await fetch("/api/verify-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: result.finalPayload,
          action: "verify-action",
          signal: userWalletAddress,
        }),
      });

      const data = await response.json();

      if (data.verifyRes.success) {
        setButtonState("success");
        setTimeout(() => {
          router.push("/home");
        }, 1000);
      } else {
        setButtonState("failed");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setButtonState("failed");
    }
  };

  return (
    // Add exclamation mark to override Tailwind's default all csss
    <div className="!flex !flex-col !items-center !justify-center !min-h-screen px-6 bg-white text-gray-900">
      <h1 className="!text-4xl !md:text-5xl !font-extrabold !text-center !tracking-tight !mb-4">
        Real People. Real Reviews.
      </h1>
      <p className="!text-base !md:text-lg !text-gray-600 !text-center !max-w-md !mb-10">
        Every reviewer is verified with World ID. No bots. No fake accounts. 
        Just authentic voices you can trust.
      </p>

      <LiveFeedback
        label={{
          failed: "Verification failed. Please try again.",
          pending: "Verifying your identity...",
          success: "Verified! Redirecting...",
        }}
        state={whichVerification === VerificationLevel.Orb ? buttonState : undefined}
        className="!w-full !max-w-xs"
      >
        <Button
          onClick={onClickVerify}
          disabled={buttonState === "pending"}
          size="lg"
          variant="primary"
          className="!w-full !bg-black !text-white !font-semibold !rounded-xl !py-3 !shadow-sm !hover:bg-gray-800 !transition"
        >
          Verify with World ID
        </Button>
      </LiveFeedback>
    </div>
  );
};

export default VerifyPage;
