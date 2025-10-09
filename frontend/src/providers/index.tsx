"use client";
// import { LocaleProvider } from '@/context/LocaleContext';
import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";
import { Analytics } from "@vercel/analytics/next";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { EmotionProvider } from "@/providers/Emotion";
import { NotificationProvider } from "@/context/NotificationContext";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { ToastContainer } from "react-toastify";

const ErudaProvider = dynamic(
  () => import("@/providers/Eruda").then((c) => c.ErudaProvider),
  { ssr: false }
);

// Define props for ClientProviders
interface ClientProvidersProps {
  children: ReactNode;
  session: Session | null; // Use the appropriate type for session from next-auth
}

/**
 * ClientProvider wraps the app with essential context providers.
 *
 * - ErudaProvider:
 *     - Should be used only in development.
 *     - Enables an in-browser console for logging and debugging.
 *
 * - MiniKitProvider:
 *     - Required for MiniKit functionality.
 *
 * This component ensures both providers are available to all child components.
 */
export default function ClientProviders({
  children,
  session,
}: ClientProvidersProps) {
  return (
    <EmotionProvider>
      <ErudaProvider>
        <MiniKitProvider>
          <SessionProvider session={session}>
            <NotificationProvider>
              {/* <LocaleProvider> */}
              <ToastContainer
                position="top-right"
                autoClose={1000}
                hideProgressBar={false}
              />
              {children}
              <Analytics />
              {/* </LocaleProvider> */}
            </NotificationProvider>
          </SessionProvider>
        </MiniKitProvider>
      </ErudaProvider>
    </EmotionProvider>
  );
}
