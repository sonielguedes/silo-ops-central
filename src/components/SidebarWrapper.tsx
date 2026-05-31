"use client";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import DemoBanner from "./DemoBanner";

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <DemoBanner />
      <Sidebar />
      <div className="ml-72 min-h-screen flex flex-col relative z-10 bg-[#07111f]">
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.1) 2px, rgba(0,212,255,0.1) 4px)",
          }}
        />
        <div className="flex-1 flex flex-col z-10 relative min-h-0">
          {children}
        </div>
      </div>
    </>
  );
}
