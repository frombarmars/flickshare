
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { UserInfo } from "@/components/Profile/UserInfo";
import { Tabs } from "@/components/Profile/Tabs";
import { ReviewList } from "@/components/Profile/ReviewList";
import { SupportList } from "@/components/Profile/SupportList";
import { NotificationsList } from "@/components/Profile/NotificationsList";
import { useProfileData } from "@/hooks/useProfileData";
import { useNotificationsData } from "@/hooks/useNotificationsData";
import { isUserMintedNFT } from "@/lib/contract_utility/nftUtility";
import { Settings } from "lucide-react";

export default function Profile() {
  const { data: session } = useSession();
  const params = useParams();
  const username = params.username as string;
  const [tab, setTab] = useState("review");
  const [hasEarlyPass, setHasEarlyPass] = useState(false);
  const [totalWLDEarned, setTotalWLDEarned] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  const { reviews, supports, userWalletAddress, userId, bio, setBio } = useProfileData(username);
  
  // Only fetch notifications for the current user's profile
  const isOwner = session?.user.username === username;
  const { unreadCount } = useNotificationsData();

  // Fetch user points
  useEffect(() => {
    const fetchPoints = async () => {
      if (!userId) {
        console.log('No userId available for fetching points');
        return;
      }
      try {
        console.log('Fetching points for userId:', userId);
        const data = await fetch(`/api/points/summary/${userId}`).then((r) =>
          r.json()
        );
        console.log('Points API response:', data);
        if (data.ok) {
          setTotalPoints(data.totalPoints || 0);
          console.log('Total points set to:', data.totalPoints);
        }
      } catch (err) {
        console.error("Failed to load points", err);
      }
    };
    fetchPoints();
  }, [userId]);

  // Check if user has minted Early Pass NFT
  useEffect(() => {
    const checkEarlyPass = async () => {
      if (!userWalletAddress) return;
      try {
        const tokenId = await isUserMintedNFT(userWalletAddress);
        setHasEarlyPass(tokenId > 0);
      } catch (err) {
        console.error("Failed to check NFT status", err);
      }
    };
    checkEarlyPass();
  }, [userWalletAddress]);

  // Calculate total WLD earned from all reviews
  useEffect(() => {
    const fetchWLDEarnings = async () => {
      if (reviews.length === 0) {
        setTotalWLDEarned(0);
        return;
      }
      
      try {
        // Fetch support amounts for each review
        const promises = reviews.map(review => 
          fetch(`/api/reviews/${review.numericId}`).then(r => r.json())
        );
        
        const reviewsData = await Promise.all(promises);
        const total = reviewsData.reduce((sum, data) => {
          // API returns { review: { coins: ... } }
          return sum + (data.review?.coins || 0);
        }, 0);
        
        setTotalWLDEarned(total);
        console.log('Total WLD Earned:', total, 'from', reviewsData.length, 'reviews');
      } catch (err) {
        console.error("Failed to calculate WLD earnings", err);
        setTotalWLDEarned(0);
      }
    };
    
    fetchWLDEarnings();
  }, [reviews]);

  const tabContent = {
    review: <ReviewList reviews={reviews} />,
    support: <SupportList supports={supports} username={username} />,
    notifications: isOwner ? <NotificationsList unreadCount={unreadCount} /> : null,
  };

  return (
    <main className="w-full min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20 safe-area-top">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <div className="w-10"></div>
          <h1 className="text-xl font-bold text-black">Profile</h1>
          {isOwner ? (
            <button
              aria-label="Settings"
              className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-black hover:bg-gray-50 rounded-xl transition-all duration-200 active:scale-95 touch-manipulation"
            >
              <Settings className="w-5 h-5" strokeWidth={2} />
            </button>
          ) : (
            <div className="w-10"></div>
          )}
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
          isOwner={isOwner}
          hasEarlyPass={hasEarlyPass}
          totalPoints={totalPoints}
          totalWLDEarned={totalWLDEarned}
        />

        <Tabs 
          tab={tab} 
          setTab={setTab} 
          isOwner={isOwner}
          unreadCount={isOwner ? unreadCount : 0}
        />

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
