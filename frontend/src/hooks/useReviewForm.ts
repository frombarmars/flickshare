
import { useState, useEffect } from "react";
import { WORD_LIMIT } from "@/constants/constants";

import { FormErrors } from "@/types/add-review";

export const useReviewForm = () => {
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});

  const wordCount = review.trim() ? review.trim().split(/\s+/).length : 0;

  useEffect(() => {
    if (wordCount > WORD_LIMIT) {
      setErrors((prev) => ({ ...prev, review: `Review must be ${WORD_LIMIT} words or less.` }));
    } else if (wordCount > 0 && wordCount < 5) {
      setErrors((prev) => ({ ...prev, review: "Review must be at least 5 words." }));
    } else {
      setErrors((prev) => ({ ...prev, review: undefined }));
    }
  }, [wordCount]);

  const validateForm = (movie: string, wordCount: number, review: string, rating: number): FormErrors => {
    const newErrors: FormErrors = {};
    if (!movie.trim()) newErrors.movie = "Movie title is required";
    if (!review.trim()) {
      newErrors.review = "Please write a review";
    } else if (wordCount < 5) {
      newErrors.review = "Review must be at least 5 words.";
    }
    if (rating === 0) newErrors.rating = "Please select a rating";
    return newErrors;
  };

  return {
    review,
    setReview,
    rating,
    setRating,
    errors,
    setErrors,
    wordCount,
    validateForm,
  };
};
