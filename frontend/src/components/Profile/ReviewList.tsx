
import Image from "next/image";
import { Star, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

import { Review } from "@/types/profile";

interface ReviewListProps {
  reviews: Review[];
}

export const ReviewList = ({ reviews }: ReviewListProps) => {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleReviewClick = (numericReviewId: string) => {
    router.push(`/review/${numericReviewId}`);
  };

  return (
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
  );
};
