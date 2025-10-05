
import { Coins, Calendar } from "lucide-react";

import { Support } from "@/types/profile";

interface SupportListProps {
  supports: Support[];
  username: string;
}

export const SupportList = ({ supports, username }: SupportListProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleSupportClick = (supportId: string) => {
    // Navigate to support transaction details
    console.log(`Navigate to support transaction ${supportId}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4 px-4">
        <h3 className="text-lg font-semibold text-gray-900">Support Given</h3>
        <span className="text-sm text-gray-500">{supports.length} transactions</span>
      </div>

      {supports.map((support) => (
        <div
          key={support.id}
          onClick={() => handleSupportClick(support.id)}
          className="bg-gray-50 rounded-xl p-4 mx-4 cursor-pointer hover:bg-gray-100 transition-colors duration-200 active:scale-[0.98] touch-manipulation"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">@{username}</span>
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
  );
};
