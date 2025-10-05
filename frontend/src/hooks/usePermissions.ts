
import { useEffect } from "react";
import { MiniKit, Permission } from "@worldcoin/minikit-js";
import { useMiniKit } from "@worldcoin/minikit-js/minikit-provider";

export const usePermissions = () => {
  const { isInstalled } = useMiniKit();

  useEffect(() => {
    const checkAndRequestPermissions = async () => {
      if (!isInstalled) return;

      try {
        const { finalPayload: permissions } = await MiniKit.commandsAsync.getPermissions();
        const notificationGranted = (permissions as any)?.permissions?.[Permission.Notifications];

        if (notificationGranted === undefined) {
          await MiniKit.commandsAsync.requestPermission({ permission: Permission.Notifications });
        }
      } catch (err) {
        console.error("Permission handling failed:", err);
      }
    };

    checkAndRequestPermissions();
  }, [isInstalled]);
};
