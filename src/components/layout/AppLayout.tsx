import Sidebar from '@/components/layout/Sidebar';
import WhatsNewModal from '@/components/WhatsNewModal';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">{children}</main>
      <WhatsNewModal />
    </div>
  );
}
