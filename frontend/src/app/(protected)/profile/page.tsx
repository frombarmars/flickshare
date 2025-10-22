"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Settings, Star, Copy, Check, Calendar, Coins, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  MiniKit,
  Permission,
  RequestPermissionPayload,
} from "@worldcoin/minikit-js";
import { useProfileData } from "@/hooks/useProfileData";
import { useNotificationsData } from "@/hooks/useNotificationsData";
import { UserInfo } from "@/components/Profile/UserInfo";
import { NotificationsList } from "@/components/Profile/NotificationsList";
import { isUserMintedNFT } from "@/lib/contract_utility/nftUtility";
import { Bell } from "lucide-react";

interface Movie {
  id: string;
  title: string;
  posterPath?: string;
}

interface Review {
  id: string;
  rating: number;
  createdAt: string;
  movie: Movie;
  numericId: string;
}

interface Support {
  id: string;
  amount: number;
  createdAt: string;
  review: {
    numericId: string;
    movie: Movie;
    reviewer: {
      username: string;
    };
  };
}

export default function Profile() {
  const { data: session } = useSession();
  const router = useRouter();
  const userName = session?.user.username || "Gerald";
  const userId = session?.user?.id || "";
  const { reviews, supports, userWalletAddress, bio, setBio } =
    useProfileData(userName);
  const { unreadCount } = useNotificationsData();
  const [tab, setTab] = useState("review");
  const [isInstalled, setIsInstalled] = useState(false);
  const [notifGranted, setNotifGranted] = useState<boolean | undefined>();
  const [showSettings, setShowSettings] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [hasEarlyPass, setHasEarlyPass] = useState(false);

  // 1. Detect MiniKit availability
  useEffect(() => {
    setIsInstalled(typeof MiniKit !== "undefined");
  }, []);

  // 2. Get current permissions
  const getPermissions = useCallback(async () => {
    if (!isInstalled) {
      console.warn("MiniKit is not installed");
      return;
    }

    try {
      const { finalPayload } = await MiniKit.commandsAsync.getPermissions();
      console.log("Current permissions finalPayload:", finalPayload);

      if (finalPayload && finalPayload.status === "success") {
        const granted = finalPayload.permissions?.notifications || false;
        setNotifGranted(granted); // true | false
      }

      return finalPayload;
    } catch (err) {
      console.error("Failed to get permissions:", err);
    }
  }, [isInstalled]);

  // 3. Request permission when user clicks
  const requestPermission = useCallback(async () => {
    if (!isInstalled) {
      console.warn("MiniKit is not installed");
      return;
    }

    try {
      const payload: RequestPermissionPayload = {
        permission: Permission.Notifications,
      };

      const response = await MiniKit.commandsAsync.requestPermission(payload);

      if (response?.finalPayload.status === "success") {
        console.log("✅ Notification permission granted:", response);
        setNotifGranted(true);
        return;
      }

      // Handle specific error codes
      if (response?.finalPayload.status === "error") {
        const code = response.finalPayload.error_code;
        console.warn("❌ Permission error:", code);

        switch (code) {
          case "user_rejected":
            alert(
              "You denied notifications. You can enable them later in World App settings."
            );
            break;

          case "already_requested":
            alert(
              "You’ve already denied notification permissions once. Please enable it manually in World App settings."
            );
            break;

          case "permission_disabled":
            alert(
              "Notifications are disabled in World App. Please enable them from settings."
            );
            break;

          case "already_granted":
            setNotifGranted(true);
            alert("Notifications are already enabled!");
            break;

          default:
            alert("Failed to request permission. Try again later.");
        }
      }
    } catch (err) {
      console.error("Permission request failed:", err);
    }
  }, [isInstalled]);

  // 4. On mount, fetch initial permissions
  useEffect(() => {
    getPermissions();
  }, [getPermissions]);

  // 5. Fetch user points - simplified
  useEffect(() => {
    const fetchPoints = async () => {
      if (!userId) return;
      try {
        const data = await fetch(`/api/points/summary/${userId}`).then((r) =>
          r.json()
        );
        if (data.ok) setTotalPoints(data.totalPoints || 0);
      } catch (err) {
        console.error("Failed to load points", err);
      }
    };
    fetchPoints();
  }, [userId]);

  // 6. Check if user has minted Early Pass NFT
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleReviewClick = (reviewId: string) => {
    router.push(`/review/${reviewId}`);
  };

  const handleSupportClick = (reviewId: string) => {
    if (reviewId) {
      router.push(`/review/${reviewId}`);
    }
  };

  const tabContent = {
    review: (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3 px-4">
          <h3 className="text-lg font-semibold text-gray-900">Your Reviews</h3>
          <span className="text-sm text-gray-500">
            {reviews.length} reviews
          </span>
        </div>

        {reviews.map((review) => (
          <div
            key={review.id}
            onClick={() => handleReviewClick(review.numericId)}
            className="bg-gray-50 rounded-lg p-3 mx-4 cursor-pointer hover:bg-gray-100 transition-colors duration-200 active:scale-[0.98] touch-manipulation border border-gray-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-16 rounded-md overflow-hidden bg-gray-200 flex-shrink-0">
                {review.movie.posterPath ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${review.movie.posterPath}`}
                    alt={`${review.movie.title} poster`}
                    width={48}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <span className="text-xs text-gray-400">No Image</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate text-sm mb-1">
                  {review.movie.title}
                </h4>

                <div className="flex items-center gap-1 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < review.rating
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                      strokeWidth={1.5}
                    />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">
                    ({review.rating}/5)
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {formatDate(review.createdAt)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
    support: (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4 px-4">
          <h3 className="text-lg font-semibold text-gray-900">Support Given</h3>
          <span className="text-sm text-gray-500">
            {supports.length} transactions
          </span>
        </div>

        {supports.map((support) => (
          <div
            key={support.id}
            onClick={() => handleSupportClick(support.review.numericId)}
            className="bg-gray-50 rounded-xl p-4 mx-4 cursor-pointer hover:bg-gray-100 transition-colors duration-200 active:scale-[0.98] touch-manipulation"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  @{userName}
                </span>
                <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                  <Image src="/wld_token.png" alt="WLD" width={16} height={16} className="object-contain" />
                  {support.amount} WLD
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>To:</span>
                  <span className="font-medium">
                    @{support.review.reviewer.username}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Review:</span>
                  <span className="font-medium truncate max-w-32">
                    {support.review.movie.title}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-500 pt-1 border-t border-gray-200">
                <Calendar className="w-3 h-3" />
                {formatDate(support.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
    notifications: <NotificationsList unreadCount={unreadCount} />,
  };

  return (
    <main className="w-full min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <div className="w-10"></div>
          <h1 className="text-xl font-bold">Profile</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Settings modal */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm relative animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors touch-manipulation active:scale-95"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-6 text-gray-900">Settings</h2>

            {/* Notifications */}
            <div
              className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 ${
                notifGranted === true
                  ? "bg-green-50 border-2 border-green-200"
                  : "bg-gray-50 border-2 border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell
                  className={`w-5 h-5 ${
                    notifGranted === true ? "text-green-600" : "text-gray-600"
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    notifGranted === true ? "text-green-900" : "text-gray-900"
                  }`}
                >
                  Notifications
                </span>
              </div>
              {notifGranted === true ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-100 px-3 py-1.5 rounded-lg">
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                  <span className="text-xs font-semibold">Enabled</span>
                </div>
              ) : (
                <button
                  onClick={requestPermission}
                  disabled={!isInstalled}
                  className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors active:scale-95 touch-manipulation ${
                    !isInstalled
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-black hover:bg-gray-800 cursor-pointer"
                  }`}
                  style={{
                    pointerEvents: 'auto',
                    position: 'relative',
                    zIndex: 1
                  }}
                >
                  {!isInstalled ? 'Initializing...' : 'Enable'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-sm mx-auto px-4">
        <section className="pt-8 pb-8">
          <UserInfo
            username={userName}
            profilePicture={session?.user.profilePicture}
            walletAddress={userWalletAddress}
            createdAt={session?.user.createdAt || new Date().toISOString()}
            bio={bio}
            setBio={setBio}
            isOwner={true}
            totalPoints={totalPoints}
            hasEarlyPass={hasEarlyPass}
          />
        </section>

        <nav className="mb-6">
          <div className="bg-gray-50 rounded-2xl p-1 border border-gray-100">
            <div className="grid grid-cols-3 gap-1">
              {["review", "support", "notifications"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`!py-2 !px-2 text-center text-sm font-semibold rounded-xl transition-all duration-200 touch-manipulation active:scale-95 relative ${
                    tab === t
                      ? "!bg-white !text-black !shadow-sm border !border-gray-200"
                      : "!text-gray-600 !hover:bg-black !hover:text-white !active:bg-black !active:text-white"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {t === "notifications" && <Bell className="w-3.5 h-3.5" />}
                    <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                    {t === "notifications" && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </nav>

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
