import { auth } from '@/auth';
import FooterContent from '@/components/FooterContent';
import { Page } from '@/components/PageLayout';
import { NotificationProvider } from '@/components/NotificationProvider';
import { redirect } from 'next/navigation';

export default async function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  return (
    <NotificationProvider>
      <Page>
        {children}
        <Page.Footer className="fixed bottom-0 w-full bg-white border-t border-gray-200 z-50">
          <FooterContent />
        </Page.Footer>
      </Page>
    </NotificationProvider>
  );
}
