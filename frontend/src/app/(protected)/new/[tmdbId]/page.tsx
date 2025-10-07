"use client";
import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { MovieSearch } from "@/components/AddReview/MovieSearch";
import { Rating } from "@/components/AddReview/Rating";
import { ReviewForm } from "@/components/AddReview/ReviewForm";
import { SubmitButton } from "@/components/AddReview/SubmitButton";
import { useMovieSearch } from "@/hooks/useMovieSearch";
import { useReviewForm } from "@/hooks/useReviewForm";
import { useSubmitReview } from "@/hooks/useSubmitReview";
import { useDailyReviewCount } from "@/hooks/useDailyReviewCount";

export default function AddReview() {
  const { data: session } = useSession();
  const { tmdbId } = useParams<{ tmdbId?: string }>();

  const { dailyCount, remaining } = useDailyReviewCount(session?.user?.id);
  const { movie, setMovie, movieId, setMovieId } = useMovieSearch(tmdbId);
  const { review, setReview, rating, setRating, errors, setErrors, wordCount, validateForm } = useReviewForm();
  const [successMessage, setSuccessMessage] = useState("");

  const { loading, isConfirming, handleSubmit } = useSubmitReview({
    movieId,
    review,
    rating,
    setErrors,
    setSuccessMessage,
    setMovie,
    setMovieId,
    setReview,
    setRating,
  });

  const isSubmitDisabled = loading || isConfirming || !session?.user?.id || Object.values(errors).some(Boolean);

  if (dailyCount !== null && remaining <= 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-800">Daily Limit Reached</h1>
          <p className="mt-2 text-gray-600">You’ve already submitted 5 reviews today. Please come back tomorrow.</p>
        </div>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm(movie, wordCount, review, rating);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    handleSubmit(e);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg mb-8">
        <h1 className="text-xl font-light text-gray-900 text-center">Add Review</h1>
        {dailyCount !== null && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
            <Lightbulb className="text-blue-500" />
            <p className="text-sm text-blue-700">You can submit {remaining} more review(s) today.</p>
          </div>
        )}
      </div>

      <form onSubmit={handleFormSubmit} className="w-full max-w-lg space-y-6">
        <MovieSearch movie={movie} setMovie={setMovie} setMovieId={setMovieId} error={errors.movie} />
        <Rating rating={rating} setRating={setRating} error={errors.rating} />
        <ReviewForm review={review} setReview={setReview} wordCount={wordCount} error={errors.review} />
        <SubmitButton
          loading={loading}
          isConfirming={isConfirming}
          isSubmitDisabled={isSubmitDisabled}
          isLoggedIn={!!session?.user?.id}
        />

        {errors.submit && (
          <div className="text-center p-4 bg-red-50 rounded-2xl border border-red-200">
            <p className="text-red-600 text-sm">{errors.submit}</p>
          </div>
        )}
        {successMessage && (
          <div className="text-center p-4 bg-green-50 rounded-2xl border border-green-200">
            <p className="text-green-600 text-sm font-medium">{successMessage}</p>
          </div>
        )}
      </form>
    </div>
  );
}