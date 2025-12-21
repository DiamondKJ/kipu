import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { Toaster } from '@/components/ui/sonner';
import { FilamentBackground } from '@/components/ui/filament-background';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-void relative">
      {/* Cosmic filament background */}
      <FilamentBackground />

      {/* Main app structure */}
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
