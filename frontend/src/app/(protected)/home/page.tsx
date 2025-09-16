"use client";
import { useCallback, useEffect, useState } from "react";
import { Permission, RequestPermissionPayload } from "@worldcoin/minikit-js";
import { MiniKit } from "@worldcoin/minikit-js";
import { useMiniKit } from "@worldcoin/minikit-js/minikit-provider";
import UsersFeedPage from "@/components/UsersFeedPage/page";
import MovieFeedPage from "@/components/MoviesFeedPage/page";
import ReviewsFeedPage from "@/components/ReviewsFeedPage/page";
import Navigation from "@/components/Navtop/page";

export default function Home() {
  const { isInstalled } = useMiniKit();
  const [activeTab, setActiveTab] = useState("reviews");

  // 1. Get current permissions
  const getPermissions = useCallback(async () => {
    if (!isInstalled) {
      console.warn("MiniKit is not installed");
      return;
    }

    try {
      const payload = await MiniKit.commandsAsync.getPermissions();
      console.log("Current permissions:", payload);
      return payload;
    } catch (err) {
      console.error("Failed to get permissions:", err);
    }
  }, []);

  // 2. Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isInstalled) {
      console.warn("MiniKit is not installed");
      return;
    }

    try {
      const requestPermissionPayload: RequestPermissionPayload = {
        permission: Permission.Notifications,
      };

      const payload = await MiniKit.commandsAsync.requestPermission(
        requestPermissionPayload
      );

      console.log("Notification permission response:", payload);
    } catch (err) {
      console.error("Permission request failed:", err);
    }
  }, [isInstalled]);

  // 3. On mount: check → request if needed
  useEffect(() => {
    const init = async () => {
      const permissionsResponse = await getPermissions();
      console.log("permissionsResponse:", permissionsResponse);

      const notificationGranted =
        (permissionsResponse?.finalPayload as any)?.permissions?.[
        Permission.Notifications
        ];

      if (notificationGranted === true) {
        console.log("Notification permission already granted ✅");
        return;
      }

      if (notificationGranted === false) {
        console.log("Notifications explicitly denied ❌, not asking again.");
        return;
      }

      // Only request if SDK gives `undefined` (never asked before)
      if (notificationGranted === undefined) {
        console.log("No notification permission yet — requesting...");
        await requestPermission();
      }
    };

    init();
  }, [getPermissions, requestPermission]);


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
