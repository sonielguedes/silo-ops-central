"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { DEMO_AUTH, buildSession, canUseDemoLogin, canUseProdLogin } from "@/lib/auth";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const session = localStorage.getItem("sil_session");
      if (session) {
        const data = JSON.parse(session);
        if (data?.expiry > Date.now()) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("sil_session");
        }
      }
    } catch {
      localStorage.removeItem("sil_session");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated && pathname !== "/login") {
      router.push("/login");
    }
  }, [isAuthenticated, loading, pathname, router]);

  const login = (email: string, pass: string) => {
    if (canUseDemoLogin(email, pass)) {
      localStorage.setItem("sil_session", JSON.stringify(buildSession(DEMO_AUTH.email, DEMO_AUTH.mode)));
      setIsAuthenticated(true);
      router.replace("/");
      return true;
    }

    const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").trim().toLowerCase();
    const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "";

    if (canUseProdLogin(email, pass, adminEmail, adminPass)) {
      localStorage.setItem("sil_session", JSON.stringify(buildSession(email, "prod")));
      setIsAuthenticated(true);
      router.replace("/");
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem("sil_session");
    setIsAuthenticated(false);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {!loading && (isAuthenticated || pathname === "/login") ? children : (
        <div className="min-h-screen bg-[#080d12] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#00d4ff]/20 border-t-[#00d4ff] rounded-full animate-spin"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
