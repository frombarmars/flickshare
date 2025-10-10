"use client";
import { Crown, Trophy, Medal, User, ArrowLeft, Star, Zap, Target, Award } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type LeaderboardUser = {
  id: string;
  username: string;
  points: number;
  level: string;
  rank: number;
};

const LeaderboardPage = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/leaderboard/${session.user.id}`);
        const data = await res.json();
        setLeaderboardData(data.leaderboard || []);
        setCurrentUser(data.currentUser || null);
        setTotalPlayers(data.totalPlayers || 0);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
        setTotalPlayers(0);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [session?.user?.id]);

  const getBadgeIcon = (rank: number) => {
    if (rank === 1) return (
      <div className="!relative">
        <Crown className="!w-5 !h-5 !text-yellow-500" />
        <div className="!absolute !-top-0.5 !-right-0.5 !w-2 !h-2 !bg-yellow-400 !rounded-full"></div>
      </div>
    );
    if (rank === 2) return <Trophy className="!w-4 !h-4 !text-gray-400" />;
    if (rank === 3) return <Medal className="!w-4 !h-4 !text-amber-600" />;
    return null;
  };

  const getRankGradient = (rank: number) => {
    if (rank === 1) return "!from-yellow-400 !to-yellow-500";
    if (rank === 2) return "!from-gray-300 !to-gray-400";
    if (rank === 3) return "!from-amber-400 !to-amber-500";
    return "!from-gray-500 !to-gray-600";
  };

  const getLevelIcon = (level: string) => {
    if (level.toLowerCase().includes("expert")) return <Award className="!w-3 !h-3 !text-gray-600" />;
    if (level.toLowerCase().includes("pro")) return <Zap className="!w-3 !h-3 !text-gray-600" />;
    if (level.toLowerCase().includes("advanced")) return <Target className="!w-3 !h-3 !text-gray-600" />;
    return <Star className="!w-3 !h-3 !text-gray-500" />;
  };

  const renderUserCard = (user: LeaderboardUser, isCurrentUser: boolean) => (
    <div
      key={user.id}
      className={`
        !relative !flex !items-center !justify-between !p-3 !rounded-xl !shadow-sm
        !transition-all !duration-200 hover:!shadow-md !mb-2
        ${isCurrentUser 
          ? "!bg-blue-50 !border !border-blue-300" 
          : "!bg-white !border !border-gray-200 hover:!bg-gray-50"
        }
        ${user.rank <= 3 ? "!ring-1 !ring-opacity-30" : ""}
        ${user.rank === 1 ? "!ring-yellow-400 !bg-yellow-50" : ""}
        ${user.rank === 2 ? "!ring-gray-400 !bg-gray-50" : ""}
        ${user.rank === 3 ? "!ring-amber-400 !bg-amber-50" : ""}
      `}
    >
      {/* Rank Badge */}
      <div className="!flex !items-center !space-x-3">
        <div className={`
          !relative !flex !items-center !justify-center !w-8 !h-8 !rounded-full
          ${user.rank <= 3 
            ? `!bg-gradient-to-br ${getRankGradient(user.rank)} !shadow-md` 
            : "!bg-gradient-to-br !from-gray-100 !to-gray-200 !shadow-sm"
          }
        `}>
          {getBadgeIcon(user.rank) || (
            <span className="!text-sm !font-bold !text-white">
              #{user.rank}
            </span>
          )}
        </div>

        {/* User Info */}
        <div className="!flex-1 !min-w-0">
          <div className="!flex !items-center !space-x-2 !mb-1">
            <p className={`
              !text-base !font-semibold !truncate
              ${isCurrentUser ? "!text-blue-700" : "!text-gray-800"}
            `}>
              {user.username}
            </p>
            {isCurrentUser && (
              <span className="!px-1.5 !py-0.5 !text-xs !font-medium !bg-blue-100 !text-blue-700 !rounded">
                You
              </span>
            )}
            {user.rank <= 3 && (
              <div className="!flex !items-center !space-x-1">
                <div className="!w-1.5 !h-1.5 !bg-yellow-500 !rounded-full"></div>
                <span className="!text-xs !font-medium !text-gray-600">TOP</span>
              </div>
            )}
          </div>
          <div className="!flex !items-center !space-x-1">
            {getLevelIcon(user.level)}
            <p className="!text-xs !text-gray-600">Level: {user.level}</p>
          </div>
        </div>
      </div>

      {/* Points Display */}
      <div className="!text-right">
        <div className={`
          !inline-flex !items-center !px-2 !py-1 !rounded-lg !font-semibold !text-sm
          ${user.rank === 1 
            ? "!bg-yellow-500 !text-white" 
            : user.rank <= 3 
              ? "!bg-gray-600 !text-white"
              : "!bg-gray-700 !text-white"
          }
        `}>
          <Star className="!w-3 !h-3 !mr-1" />
          {user.points.toLocaleString()}
        </div>
        <p className="!text-xs !text-gray-500 !mt-0.5">points</p>
      </div>

      {/* Rank position indicator for top 10 */}
      {user.rank <= 10 && (
        <div className="!absolute !-top-1 !-right-1 !w-5 !h-5 !bg-gray-600 !rounded-full !flex !items-center !justify-center">
          <span className="!text-xs !font-bold !text-white">#{user.rank}</span>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="!min-h-screen !bg-gray-50 !w-full !flex !flex-col">
        {/* Header */}
        <div className="!sticky !top-0 !z-50 !bg-white !px-4 !py-4 !border-b !border-gray-200 !shadow-sm">
          <div className="!flex !items-center !justify-between">
            <button
              onClick={() => router.back()}
              className="!p-2 !rounded-full !bg-gray-100 hover:!bg-gray-200 !transition-colors"
            >
              <ArrowLeft className="!w-5 !h-5 !text-gray-700" />
            </button>
            <h1 className="!text-xl !font-bold !text-gray-900 !flex !items-center !gap-2">
              <Trophy className="!w-6 !h-6 !text-gray-600" />
              Leaderboard
            </h1>
            <div className="!w-9"></div>
          </div>
        </div>

        {/* Loading State */}
        <div className="!flex-1 !flex !items-center !justify-center">
          <div className="!text-center">
            <div className="!w-16 !h-16 !border-4 !border-gray-200 !border-t-gray-600 !rounded-full !animate-spin !mx-auto !mb-4"></div>
            <p className="!text-gray-600 !font-medium">Loading rankings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="!min-h-screen !bg-gray-50 !w-full !flex !flex-col">
      {/* Enhanced Header */}
      <div className="!sticky !top-0 !z-50 !bg-white !px-4 !py-4 !border-b !border-gray-200 !shadow-sm">
        <div className="!flex !items-center !justify-between">
          <button
            onClick={() => router.back()}
            className="!p-2 !rounded-full !bg-gray-100 hover:!bg-gray-200 !transition-colors"
          >
            <ArrowLeft className="!w-5 !h-5 !text-gray-700" />
          </button>
          <h1 className="!text-xl !font-bold !text-gray-900 !flex !items-center !gap-2">
            <Trophy className="!w-6 !h-6 !text-gray-600" />
            Leaderboard
          </h1>
          <div className="!w-9"></div>
        </div>
        
        {/* Stats Bar */}
        <div className="!mt-2 !flex !justify-center !space-x-4">
          <div className="!text-center">
            <p className="!text-lg !font-bold !text-gray-700">{totalPlayers}</p>
            <p className="!text-xs !text-gray-500 !uppercase !tracking-wide">Total Players</p>
          </div>
          {currentUser && (
            <div className="!text-center">
              <p className="!text-lg !font-bold !text-gray-700">#{currentUser.rank}</p>
              <p className="!text-xs !text-gray-500 !uppercase !tracking-wide">Your Rank</p>
            </div>
          )}
        </div>
      </div>

      {/* Podium Section for Top 3 */}
      {leaderboardData.length >= 3 && (
        <div className="!px-4 !py-4 !bg-white">
          <div className="!flex !items-end !justify-center !space-x-3 !mb-3">
            {/* 2nd Place */}
            <div className="!text-center !transform !translate-y-2">
              <div className="!w-14 !h-14 !mx-auto !mb-2 !bg-gray-400 !rounded-full !flex !items-center !justify-center !shadow-md">
                <Trophy className="!w-7 !h-7 !text-white" />
              </div>
              <p className="!font-semibold !text-gray-800 !truncate !max-w-[60px] !text-sm">{leaderboardData[1]?.username}</p>
              <p className="!text-xs !text-gray-600">{leaderboardData[1]?.points.toLocaleString()}</p>
            </div>

            {/* 1st Place */}
            <div className="!text-center">
              <div className="!w-16 !h-16 !mx-auto !mb-2 !bg-yellow-500 !rounded-full !flex !items-center !justify-center !shadow-lg !relative">
                <Crown className="!w-8 !h-8 !text-white" />
                <div className="!absolute !-top-0.5 !-right-0.5 !w-3 !h-3 !bg-yellow-400 !rounded-full"></div>
              </div>
              <p className="!font-semibold !text-gray-800 !truncate !max-w-[70px] !text-sm">{leaderboardData[0]?.username}</p>
              <p className="!text-xs !text-gray-600">{leaderboardData[0]?.points.toLocaleString()}</p>
            </div>

            {/* 3rd Place */}
            <div className="!text-center !transform !translate-y-3">
              <div className="!w-12 !h-12 !mx-auto !mb-2 !bg-amber-500 !rounded-full !flex !items-center !justify-center !shadow-md">
                <Medal className="!w-6 !h-6 !text-white" />
              </div>
              <p className="!font-semibold !text-gray-800 !truncate !max-w-[50px] !text-sm">{leaderboardData[2]?.username}</p>
              <p className="!text-xs !text-gray-600">{leaderboardData[2]?.points.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Current User's Rank Card - Always at Top */}
      {currentUser && (
        <div className="!px-4 !py-3 !bg-blue-50 !border-b !border-blue-200">
          <div className="!max-w-2xl !mx-auto">
            <div className="!text-center !text-sm !text-blue-700 !mb-2 !font-medium">
              Your Position
            </div>
            {renderUserCard(currentUser, true)}
          </div>
        </div>
      )}

      {/* Rankings List */}
      <div className="!flex-1 !overflow-y-auto !px-4 !py-2 !pb-36">
        <div className="!max-w-2xl !mx-auto">
          {leaderboardData.length === 0 ? (
            <div className="!text-center !py-12">
              <Trophy className="!w-16 !h-16 !text-gray-300 !mx-auto !mb-4" />
              <p className="!text-gray-500 !font-medium">No rankings available yet</p>
              <p className="!text-sm !text-gray-400 !mt-2">Start reviewing movies to appear on the leaderboard!</p>
            </div>
          ) : (
            <>
              <div className="!text-center !py-3 !border-b !border-gray-200 !mb-3">
                <h2 className="!text-base !font-bold !text-gray-800">Top 50 Rankings</h2>
                <p className="!text-xs !text-gray-500">
                  Showing top {showAll ? leaderboardData.length : Math.min(50, leaderboardData.length)} of {totalPlayers} players
                </p>
              </div>

              {(showAll ? leaderboardData : leaderboardData.slice(0, 50)).map((user) =>
                renderUserCard(user, session?.user?.id === user.id)
              )}
              
              {/* Show More Button */}
              {!showAll && leaderboardData.length > 50 && (
                <div className="!text-center !py-4">
                  <button
                    onClick={() => setShowAll(true)}
                    className="!px-4 !py-2 !bg-gray-700 !text-white !rounded-lg !text-sm !font-medium hover:!bg-gray-800 !transition-colors"
                  >
                    Show All {leaderboardData.length} Users
                  </button>
                  <p className="!text-xs !text-gray-500 !mt-2">
                    Currently showing top 50 of {totalPlayers} total players
                  </p>
                </div>
              )}
              
              {/* Show Less Button */}
              {showAll && leaderboardData.length > 50 && (
                <div className="!text-center !py-4">
                  <button
                    onClick={() => setShowAll(false)}
                    className="!px-4 !py-2 !bg-gray-600 !text-white !rounded-lg !text-sm !font-medium hover:!bg-gray-700 !transition-colors"
                  >
                    Show Top 50 Only
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>


    </div>
  );
};

export default LeaderboardPage;
