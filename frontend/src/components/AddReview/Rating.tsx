
import { useState } from "react";
import { Star } from "lucide-react";

interface RatingProps {
  rating: number;
  setRating: (rating: number) => void;
  error?: string;
}

export const Rating = ({ rating, setRating, error }: RatingProps) => {
  const [hoveredRating, setHoveredRating] = useState(0);

  return (
    <div className="rounded-2xl px-5 py-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <label className="text-gray-700 font-medium text-sm">Rating:</label>
        <div className="flex items-center gap-0.5 mx-4">
          {[1, 2, 3, 4, 5].map((star) => {
            const currentRating = hoveredRating || rating;
            return (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="!relative !w-8 !h-8 !flex !items-center !justify-center"
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
              >
                <Star
                  className={`!w-8 !h-8 transition-all duration-200 ${
                    currentRating >= star
                      ? "!text-yellow-400 fill-yellow-400"
                      : "!text-gray-300"
                  }`}
                />
              </button>
            );
          })}
        </div>
        <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm min-w-[60px] text-center">
          <span className="text-base font-semibold text-gray-800">
            {hoveredRating > 0 ? hoveredRating : rating > 0 ? rating : "—"}
          </span>
          <span className="text-gray-500 text-sm ml-0.5">/5</span>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
      )}
    </div>
  );
};
