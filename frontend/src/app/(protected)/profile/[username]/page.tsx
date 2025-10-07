
"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { UserInfo } from "@/components/Profile/UserInfo";
import { Tabs } from "@/components/Profile/Tabs";
import { ReviewList } from "@/components/Profile/ReviewList";
import { SupportList } from "@/components/Profile/SupportList";
import { useProfileData } from "@/hooks/useProfileData";
import { Settings } from "lucide-react";

export default function Profile() {
  const { data: session } = useSession();
  const params = useParams();
  const username = params.username as string;
  const [tab, setTab] = useState("review");

  const { reviews, supports, userWalletAddress, bio, setBio } = useProfileData(username);

  const tabContent = {
    review: <ReviewList reviews={reviews} />,
    support: <SupportList supports={supports} username={username} />,
  };

  return (
    <main className="w-full min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20 safe-area-top">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <div className="w-10"></div>
          <h1 className="text-xl font-bold text-black">Profile</h1>
          <button
            aria-label="Settings"
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-black hover:bg-gray-50 rounded-xl transition-all duration-200 active:scale-95 touch-manipulation"
          >
            <Settings className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="max-w-sm mx-auto px-4">
        <UserInfo
          username={username}
          profilePicture={session?.user.profilePicture}
          walletAddress={userWalletAddress}
          createdAt={session?.user.createdAt || new Date().toISOString()}
          bio={bio}
          setBio={setBio}
          isOwner={session?.user.username === username}
        />

        <Tabs tab={tab} setTab={setTab} />

        <section className="pb-8">
          <div className="min-h-[320px] transition-all duration-300 ease-in-out">
            {tabContent[tab]}
          </div>
        </section>
      </div>
      <div className="h-14 bg-white safe-area-bottom"></div>
    </main>
  );
}
