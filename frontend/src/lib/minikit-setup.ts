"use client";

import { MiniKit, Permission } from "@worldcoin/minikit-js";
import { ENV_VARIABLES } from "@/constants/env_variables";

// Track if MiniKit is already installed
let isInstalled = false;

/**
 * Initialize MiniKit with proper event handlers
 * This fixes the "No handler for event" errors
 */
export function initializeMiniKit() {
  if (isInstalled || typeof window === "undefined") {
    return;
  }

  try {
    // Install MiniKit - this automatically sets up event handlers
    MiniKit.install(ENV_VARIABLES.WORLD_MINIAPP_ID);

    isInstalled = true;
    console.log("✅ MiniKit initialized successfully");
  } catch (error) {
    console.error("Failed to initialize MiniKit:", error);
  }
}

/**
 * Check if MiniKit is ready
 */
export function isMiniKitReady(): boolean {
  return isInstalled && MiniKit.isInstalled();
}

/**
 * Get permissions helper
 */
export async function getPermissions() {
  if (!isMiniKitReady()) {
    console.warn("MiniKit not ready");
    return null;
  }

  try {
    const payload = await MiniKit.commandsAsync.getPermissions();
    console.log("Permissions payload:", payload);
    return payload;
  } catch (error) {
    console.error("Error getting permissions:", error);
    return null;
  }
}

/**
 * Request permission helper
 */
export async function requestPermission(permissionType: Permission) {
  if (!isMiniKitReady()) {
    console.warn("MiniKit not ready");
    return null;
  }

  try {
    const payload = await MiniKit.commandsAsync.requestPermission({
      permission: permissionType,
    });
    console.log("Permission request payload:", payload);
    return payload;
  } catch (error) {
    console.error("Error requesting permission:", error);
    return null;
  }
}
