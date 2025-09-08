import { auth } from '@/auth';
import FooterContent from '@/components/FooterContent';
import { Page } from '@/components/PageLayout';
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
    <Page>
      {children}
      <Page.Footer className="px-0 fixed bottom-0 w-full bg-white z-50 border-t border-gray-200 shadow-md">
        <FooterContent />
      </Page.Footer>
    </Page>
  );
}
