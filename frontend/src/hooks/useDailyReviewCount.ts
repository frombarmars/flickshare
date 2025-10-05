
import { useState, useEffect } from "react";

export const useDailyReviewCount = (userId?: string) => {
  const [dailyCount, setDailyCount] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number>(5);

  useEffect(() => {
    async function fetchDailyCount() {
      if (!userId) return;

      try {
        const res = await fetch(`/api/reviews/count?userId=${userId}`);
        const { count } = await res.json();
        setDailyCount(count);
        setRemaining(5 - count);
      } catch (err) {
        console.error("Failed to fetch daily review count", err);
      }
    }

    fetchDailyCount();
  }, [userId]);

  return { dailyCount, remaining };
};
