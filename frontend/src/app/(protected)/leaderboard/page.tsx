"use client";
import { Crown, Trophy, Medal, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type LeaderboardUser = {
  id: string;
  username: string;
  points: number;
  level: string;
};

const LeaderboardPage = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/leaderboard");
        const data = await res.json();
        setLeaderboardData(data);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      }
    };
    fetchLeaderboard();
  }, []);

  const formatNumber = (num: number) =>
    num >= 1000 ? (num / 1000).toFixed(1) + "k" : num.toString();

  const getBadgeIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <User className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white px-4 py-4 border-b shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 text-center">
          Leaderboard
        </h1>
      </div>

      {/* Rankings */}
      <div className="px-4 py-6">
        {leaderboardData.map((user, index) => {
          const rank = index + 1;
          const isCurrentUser = session?.user?.id === user.id;

          return (
            <div
              key={user.id}
              className={`flex items-center justify-between p-4 mb-3 rounded-xl border transition-transform 
                ${rank === 1
                  ? "bg-yellow-50 border-yellow-300 shadow"
                  : rank === 2
                  ? "bg-gray-50 border-gray-300"
                  : rank === 3
                  ? "bg-amber-50 border-amber-300"
                  : "bg-white border-gray-200"
                }
                ${isCurrentUser ? "ring-2 ring-blue-500 scale-[1.02]" : ""}`}
            >
              {/* Left Side */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border font-bold text-sm text-gray-700">
                  #{rank}
                </div>
                {getBadgeIcon(rank)}
                <div>
                  <p className={`font-medium ${isCurrentUser ? "text-blue-600" : "text-gray-900"}`}>
                    {user.username}
                    {isCurrentUser && " (You)"}
                  </p>
                  <p className="text-xs text-gray-500">{user.level}</p>
                </div>
              </div>

              {/* Points */}
              <div className="text-right">
                <p className={`font-bold text-lg ${isCurrentUser ? "text-blue-600" : "text-gray-900"}`}>
                  {formatNumber(user.points)}
                </p>
                <p className="text-xs text-gray-500 uppercase">PTS</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LeaderboardPage;