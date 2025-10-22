import { useEffect, useState, useCallback } from "react";
import { MiniKit, Permission } from "@worldcoin/minikit-js";
import { useMiniKit } from "@worldcoin/minikit-js/minikit-provider";

interface PermissionsState {
  notifications: boolean;
  microphone: boolean;
  contacts: boolean;
}

export const usePermissions = () => {
  const { isInstalled } = useMiniKit();
  const [permissions, setPermissions] = useState<PermissionsState | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch current permissions
  const fetchPermissions = useCallback(async () => {
    if (!isInstalled) return;

    setLoading(true);
    try {
      // ✅ MiniKit returns { commandPayload, finalPayload }
      const { finalPayload } = await MiniKit.commandsAsync.getPermissions();
      
      console.log("Permissions finalPayload:", finalPayload);
      
      // ✅ Handle the response properly - check finalPayload
      if (finalPayload && finalPayload.status === "success" && finalPayload.permissions) {
        setPermissions({
          notifications: finalPayload.permissions.notifications || false,
          microphone: finalPayload.permissions.microphone || false,
          contacts: finalPayload.permissions.contacts || false,
        });
      }
    } catch (err) {
      console.error("Failed to get permissions:", err);
    } finally {
      setLoading(false);
    }
  }, [isInstalled]);

  // Request notification permission
  const requestNotifications = useCallback(async () => {
    if (!isInstalled) return false;

    setLoading(true);
    try {
      // ✅ MiniKit returns { commandPayload, finalPayload }
      const { finalPayload } = await MiniKit.commandsAsync.requestPermission({
        permission: Permission.Notifications,
      });

      console.log("Request notification finalPayload:", finalPayload);

      if (finalPayload && finalPayload.status === "success") {
        // Refresh permissions after request
        await fetchPermissions();
        // Return true if granted, check the payload structure
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to request notifications:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isInstalled, fetchPermissions]);

  // Request contacts permission
  const requestContacts = useCallback(async () => {
    if (!isInstalled) return false;

    setLoading(true);
    try {
      const { finalPayload } = await MiniKit.commandsAsync.requestPermission({
        permission: Permission.Contacts,
      });

      console.log("Request contacts finalPayload:", finalPayload);

      if (finalPayload && finalPayload.status === "success") {
        await fetchPermissions();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to request contacts:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isInstalled, fetchPermissions]);

  // Request microphone permission
  const requestMicrophone = useCallback(async () => {
    if (!isInstalled) return false;

    setLoading(true);
    try {
      const { finalPayload } = await MiniKit.commandsAsync.requestPermission({
        permission: Permission.Microphone,
      });

      console.log("Request microphone finalPayload:", finalPayload);

      if (finalPayload && finalPayload.status === "success") {
        await fetchPermissions();
        return (finalPayload as any).granted || (finalPayload as any).isGranted || false;
      }
      return false;
    } catch (err) {
      console.error("Failed to request microphone:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isInstalled, fetchPermissions]);

  // ✅ Auto-fetch permissions on mount
  useEffect(() => {
    if (isInstalled) {
      fetchPermissions();
    }
  }, [isInstalled, fetchPermissions]);

  return {
    permissions,
    loading,
    fetchPermissions,
    requestNotifications,
    requestContacts,
    requestMicrophone,
  };
};