"use client";
import { Crown, Trophy, Medal, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`/api/leaderboard/${session.user.id}`);
        const data = await res.json();
        setLeaderboardData(data.leaderboard || []);
        setCurrentUser(data.currentUser || null);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      }
    };

    fetchLeaderboard();
  }, [session?.user?.id]);

  const getBadgeIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <User className="w-4 h-4 text-gray-400" />;
  };

  const renderUserCard = (user: LeaderboardUser, isCurrentUser: boolean) => (
    <div
      key={user.id}
      className={`flex items-center justify-between p-4 mb-3 rounded-xl border transition-transform 
        ${
          user.rank === 1
            ? "bg-yellow-50 border-yellow-300 shadow"
            : user.rank === 2
            ? "bg-gray-50 border-gray-300"
            : user.rank === 3
            ? "bg-amber-50 border-amber-300"
            : "bg-white border-gray-200"
        }
        ${isCurrentUser ? "ring-2 ring-blue-500 scale-[1.02]" : ""}`}
    >
      {/* Left Side */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border font-bold text-sm text-gray-700">
          #{user.rank}
        </div>
        {getBadgeIcon(user.rank)}
        <div>
          <p
            className={`font-medium ${
              isCurrentUser ? "text-blue-600" : "text-gray-900"
            }`}
          >
            {user.username}
            {isCurrentUser && " (You)"}
          </p>
          <p className="text-xs text-gray-500">{user.level}</p>
        </div>
      </div>

      {/* Points */}
      <div className="text-right">
        <p
          className={`font-bold text-lg ${
            isCurrentUser ? "text-blue-600" : "text-gray-900"
          }`}
        >
          {user.points}
        </p>
        <p className="text-xs text-gray-500 uppercase">PTS</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white px-4 py-4 border-b shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 text-center">
          Leaderboard
        </h1>
      </div>

      {/* Rankings */}
      <div className="px-4 py-6 pb-28">
        {leaderboardData.map((user) =>
          renderUserCard(user, session?.user?.id === user.id)
        )}
      </div>

      {currentUser && !leaderboardData.some((u) => u.id === currentUser.id) && (
        <div className="!fixed bottom-0 !left-0 !right-0 !bg-white !border-t !shadow-lg">
          <div className="!text-center !text-xs !text-gray-400 !py-1 !border-b">
            Your Rank
          </div>
          <div className="!p-4">{renderUserCard(currentUser, true)}</div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
