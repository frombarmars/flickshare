
import { WORD_LIMIT } from "@/constants/constants";

interface ReviewFormProps {
  review: string;
  setReview: (review: string) => void;
  wordCount: number;
  error?: string;
}

export const ReviewForm = ({ review, setReview, wordCount, error }: ReviewFormProps) => {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center">
        <label className="text-gray-700 font-medium">Your Review</label>
        <span
          className={`text-sm ${
            wordCount > WORD_LIMIT ? "text-red-500" : "text-gray-500"
          }`}
        >
          {WORD_LIMIT - wordCount} words remaining
        </span>
      </div>
      <textarea
        placeholder="Share your thoughts..."
        value={review}
        onChange={(e) => setReview(e.target.value)}
        rows={6}
        className="!w-full !px-5 !py-4 !text-gray-700 !placeholder-gray-400 !resize-none !focus:outline-none !bg-transparent"
      />
      {error && (
        <div className="px-5 pb-4">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
};
