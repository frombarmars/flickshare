
import { useState, useEffect } from "react";

import { Review, Support } from "@/types/profile";

export const useProfileData = (username?: string) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [supports, setSupports] = useState<Support[]>([]);
  const [userWalletAddress, setUserWalletAddress] = useState("");
  const [userId, setUserId] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!username) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/profile/${username}`);
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        setUserId(data.data.id || "");
        setUserWalletAddress(data.data.walletAddress)
        setReviews(data.data.reviews || []);
        setSupports(data.data.supports || []);
        setBio(data.data.bio || "");
      } catch (err) {
        console.error("Error fetching profile data:", err);
      }
    };

    fetchProfile();
  }, [username]);

  return { reviews, supports, userWalletAddress, userId, bio, setBio };
};
