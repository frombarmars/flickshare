"use client";
import { useSearchParams } from "next/navigation";
import { AuthButton } from "@/components/AuthButton";
import { Page } from "@/components/PageLayout";

export default function Home() {
  const searchParams = useSearchParams();

  // Handle invite code
  const invite = searchParams.get("invite");
  if (invite) {
    localStorage.setItem("inviteCode", invite);
  }

  return (
    <Page>
      <Page.Main className="flex flex-col items-center justify-center min-h-screen p-0">
        <div className="w-screen h-screen bg-white dark:bg-black flex flex-col items-center justify-center">
          <div className="flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-black dark:text-white text-5xl md:text-7xl font-extrabold tracking-wide mb-8">
              WATCH REVIEW EARN
            </h1>
            
            <div className="w-40 h-0.5 bg-gray-400 dark:bg-gray-600 mb-8"></div>

            <p className="uppercase text-black dark:text-white text-base md:text-xl font-medium tracking-wide opacity-90 mb-3">
              Where Movies Meet Web3
            </p>
            <p className="text-black dark:text-white text-sm md:text-lg italic font-light opacity-70">
              Own your reviews. Share your voice.
            </p>

            {/* Auth Button */}
            <div className="mt-12">
              <AuthButton />
            </div>
          </div>
        </div>
      </Page.Main>
    </Page>
  );
}