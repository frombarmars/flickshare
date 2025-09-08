"use client";
import { Page } from "@/components/PageLayout";
import { AuthButton } from "@/components/AuthButton";

export default function WalletLoginPage() {
  return (
    <Page>
      <Page.Main className="flex flex-col items-center justify-center">
        <AuthButton />
      </Page.Main>
    </Page>
  );
}
