"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Settings, Star, Copy, Check, Calendar, Coins, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { CircularIcon } from "@worldcoin/mini-apps-ui-kit-react";
import { CheckCircleSolid } from "iconoir-react";
import { useRouter } from "next/navigation";
import { MiniKit, Permission, RequestPermissionPayload } from "@worldcoin/minikit-js";

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
  const userWalletAddress = session?.user.walletAddress || "0x1234567890abcdef1234567890abcdef12345678";
  const userName = session?.user.username || "Gerald";
  const [tab, setTab] = useState("review");
  const [copied, setCopied] = useState(false);
  // const [activityFilter, setActivityFilter] = useState("all");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [supports, setSupports] = useState<Support[]>([]);

  const [isInstalled, setIsInstalled] = useState(false);
  const [notifGranted, setNotifGranted] = useState<boolean | undefined>();
  const [showSettings, setShowSettings] = useState(false);

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
      const payload = await MiniKit.commandsAsync.getPermissions();
      console.log("Current permissions:", payload);

      const granted =
        (payload?.finalPayload as any)?.permissions?.[Permission.Notifications];

      setNotifGranted(granted); // true | false | undefined
      return payload;
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
      const requestPermissionPayload: RequestPermissionPayload = {
        permission: Permission.Notifications,
      };

      const payload = await MiniKit.commandsAsync.requestPermission(
        requestPermissionPayload
      );

      console.log("Notification permission response:", payload);

      const granted =
        (payload?.finalPayload as any)?.permissions?.[Permission.Notifications];

      setNotifGranted(granted);
    } catch (err) {
      console.error("Permission request failed:", err);
    }
  }, [isInstalled]);

  // 4. On mount, fetch initial permissions
  useEffect(() => {
    getPermissions();
  }, [getPermissions]);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(userWalletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.log("Copy failed");
    }
  };

  useEffect(() => {
    if (!userName) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/profile/${userName}`);
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        console.log("Profile API response:", data);

        setReviews(data.data.reviews || []);
        setSupports(data.data.supports || []);
      } catch (err) {
        console.error("Error fetching profile data:", err);
      }
    };

    fetchProfile();
  }, [userName]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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
          <span className="text-sm text-gray-500">{reviews.length} reviews</span>
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
                <h4 className="font-medium text-gray-900 truncate text-sm mb-1">{review.movie.title}</h4>

                <div className="flex items-center gap-1 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      strokeWidth={1.5}
                    />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">({review.rating}/5)</span>
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
          <span className="text-sm text-gray-500">{supports.length} transactions</span>
        </div>

        {supports.map((support) => (
          <div
            key={support.id}
            onClick={() => handleSupportClick(support.review.numericId)}
            className="bg-gray-50 rounded-xl p-4 mx-4 cursor-pointer hover:bg-gray-100 transition-colors duration-200 active:scale-[0.98] touch-manipulation"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">@{userName}</span>
                <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                  <Coins className="w-4 h-4" />
                  {support.amount} WLD
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>To:</span>
                  <span className="font-medium">@{support.review.reviewer.username}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Review:</span>
                  <span className="font-medium truncate max-w-32">{support.review.movie.title}</span>
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
    // activity: (
    //   <div className="space-y-4 px-4 pb-6">
    //     <div className="flex items-center gap-2">
    //       {[
    //         { key: "all", label: "All" },
    //         { key: "review", label: "Reviews" },
    //         { key: "support", label: "Support" },
    //         { key: "verify", label: "Verifications" },
    //       ].map((f) => (
    //         <button
    //           key={f.key}
    //           onClick={() => setActivityFilter(f.key)}
    //           className={`text-sm px-3 py-1 rounded-lg font-medium transition-all duration-150 ${activityFilter === f.key
    //             ? "bg-white text-black shadow-sm border border-gray-200"
    //             : "text-gray-600 hover:bg-gray-800 hover:text-white"
    //             }`}
    //         >
    //           {f.label}
    //         </button>
    //       ))}
    //     </div>

    //     <div className="mt-3 space-y-3">
    //       {activityHistory.filter(a => activityFilter === "all" ? true : a.type === activityFilter).length === 0 ? (
    //         <div className="flex flex-col items-center justify-center py-12">
    //           <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
    //             <Activity className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
    //           </div>
    //           <p className="text-sm text-gray-500 text-center max-w-xs">
    //             No activity for this filter yet. Start reviewing movies or send support to see activity here.
    //           </p>
    //         </div>
    //       ) : (
    //         activityHistory
    //           .filter(a => activityFilter === "all" ? true : a.type === activityFilter)
    //           .map((item) => (
    //             <div
    //               key={item.id}
    //               onClick={() => {
    //                 if (item.type === "review") handleReviewClick(item.originId);
    //                 if (item.type === "support") handleSupportClick(item.originId);
    //               }}
    //               className="bg-gray-50 rounded-xl p-3 flex items-start gap-3 cursor-pointer hover:bg-gray-100 transition-colors duration-150"
    //             >
    //               <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 border border-gray-200 bg-white">
    //                 {item.type === "review" && <Star className="w-5 h-5 text-yellow-400" strokeWidth={1.5} />}
    //                 {item.type === "support" && <Coins className="w-5 h-5 text-green-600" />}
    //                 {item.type === "verify" && <CheckCircleSolid className="w-5 h-5 text-blue-600" />}
    //               </div>

    //               <div className="flex-1 min-w-0">
    //                 <div className="flex items-center justify-between">
    //                   <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
    //                   <div className="text-xs text-gray-500 flex items-center gap-1">
    //                     <Calendar className="w-3 h-3" />
    //                     {formatDate(item.date)}
    //                   </div>
    //                 </div>

    //                 {item.subtitle && <div className="text-xs text-gray-500 mt-1 truncate">{item.subtitle}</div>}

    //                 {item.posterUrl && (
    //                   <div className="mt-2 w-20 h-28 rounded-md overflow-hidden bg-gray-200">
    //                     <Image src={item.posterUrl} alt="" width={80} height={112} className="object-cover w-full h-full" />
    //                   </div>
    //                 )}
    //               </div>
    //             </div>
    //           ))
    //       )}
    //     </div>
    //   </div>
    // ),
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-[90%] max-w-sm relative">
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-semibold mb-4">Settings</h2>

            {/* Notifications */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Notifications</span>
              {notifGranted === true ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <button
                  onClick={requestPermission}
                  className="px-3 py-1 text-xs rounded-lg bg-black text-white hover:bg-gray-800"
                >
                  Enable
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-sm mx-auto px-4">
        <section className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full border-3 border-gray-200 shadow-lg overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
                {session?.user.profilePicture ? (
                  <Image
                    src={session.user.profilePicture}
                    alt="User Avatar"
                    width={128}
                    height={128}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                    <svg
                      className="w-16 h-16 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1 mb-6">
              <div className="flex items-center justify-center">
                <h2 className="text-xl font-bold text-black">{userName}</h2>
                <CircularIcon size="sm">
                  <CheckCircleSolid className="text-blue-600" />
                </CircularIcon>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-4 h-4 flex-shrink-0"><Calendar className="w-4 h-4 text-gray-400" /></span>
                <span>Joined:</span>
                <span className="font-medium text-gray-900 truncate">{formatDate(session?.user.createdAt || new Date().toISOString())}</span>
              </div>
            </div>
            <button
              onClick={handleCopyAddress}
              className="w-full rounded-2xl px-4 py-5 bg-grey-50 hover:shadow-md active:shadow-sm transition-all duration-200 touch-manipulation active:scale-[0.98] group"
            >
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200">
                <span className="text-xs font-mono text-gray-700 truncate w-[calc(100%-28px)]">
                  {userWalletAddress.slice(0, 5)}...{userWalletAddress.slice(-4)}
                </span>

                {copied ? (
                  <Check className="w-5 h-5 text-green-600 transition-transform duration-200 scale-105 flex-shrink-0" strokeWidth={2.5} />
                ) : (
                  <Copy className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors duration-200 flex-shrink-0" strokeWidth={2} />
                )}
              </div>

              {copied && (
                <p className="text-xs text-green-600 mt-4 font-medium text-center animate-fadeIn">
                  Copied to clipboard!
                </p>
              )}
            </button>
          </div>
        </section>


        <nav className="mb-6">
          <div className="bg-gray-50 rounded-2xl p-1 border border-gray-100">
            <div className="grid grid-cols-2 gap-1">
              {["review", "support"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`!py-2 !px-2 text-center text-sm font-semibold rounded-xl transition-all duration-200 touch-manipulation active:scale-95 ${tab === t
                    ? "!bg-white !text-black !shadow-sm border !border-gray-200"
                    : "!text-gray-600 !hover:bg-black !hover:text-white !active:bg-black !active:text-white"
                    }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
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