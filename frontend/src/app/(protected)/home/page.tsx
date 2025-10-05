"use client";
import { useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import UsersFeedPage from "@/components/UsersFeedPage/page";
import MovieFeedPage from "@/components/MoviesFeedPage/page";
import ReviewsFeedPage from "@/components/ReviewsFeedPage/page";
import Navigation from "@/components/Navtop/page";

export default function Home() {
  usePermissions();
  const [activeTab, setActiveTab] = useState("reviews");


  return (
    <main className="w-screen h-screen bg-white">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="pt-16 h-full overflow-y-auto">
        <div className="pb-4">
          {activeTab === "reviews" && <ReviewsFeedPage />}
          {activeTab === "movies" && <MovieFeedPage />}
          {activeTab === "users" && <UsersFeedPage />}
        </div>
      </div>
    </main>
  );
}
