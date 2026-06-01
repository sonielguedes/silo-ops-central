"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { IS_DEMO } from "@/lib/app-env";
import { sanitizeReturnTo } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));

  useEffect(() => {
    if (!isAuthenticated) return;
    setRedirecting(true);
    router.replace(returnTo);
  }, [isAuthenticated, returnTo, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await login(email, password, returnTo);
    if (!result.ok) {
      setError(result.message || "Credenciais inválidas. Verifique seu e-mail e senha.");
      return;
    }

    router.replace(result.returnTo || returnTo);
  };

  if (redirecting || isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#080d12] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00d4ff]/20 border-t-[#00d4ff] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d12] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00d4ff]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm space-y-8 relative z-10">
        <div className="text-center space-y-4">
          <div className="relative w-72 max-w-full h-72 mx-auto mb-2 drop-shadow-[0_0_18px_rgba(0,212,255,0.28)]">
            <div className="w-full h-full bg-[#050a0f] border border-[#1e2d3d] rounded-[28px] flex items-center justify-center overflow-hidden">
              <Image src="/logo-silo.png" alt="Marca SILO OPS" fill className="object-cover" priority />
            </div>
          </div>
          <div>
            <h1 className="text-[#c8d8e8] text-xl font-bold tracking-tight">SILO OPS Central</h1>
            <p className="text-[#4a6a8a] text-xs uppercase tracking-widest mt-1">Centro de Operações Agrícolas em Tempo Real</p>
          </div>
        </div>

        {IS_DEMO && (
          <div className="bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#8fdfff] text-[11px] px-4 py-3 rounded-xl">
            Ambiente demonstrativo ativo. O acesso comercial está habilitado para a conta demo.
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[#111820] border border-[#1e2d3d] rounded-2xl p-6 space-y-6 shadow-2xl">
          {error && (
            <div className="bg-[#ff3d57]/10 border border-[#ff3d57]/30 text-[#ff3d57] text-xs px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[#4a6a8a] text-[10px] uppercase font-bold tracking-wider">E-mail de Acesso</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="sil-input w-full" placeholder="seu e-mail" required />
          </div>

          <div className="space-y-2">
            <label className="text-[#4a6a8a] text-[10px] uppercase font-bold tracking-wider">Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="sil-input w-full" placeholder="••••••••" required />
          </div>

          <button type="submit" className="btn-primary w-full py-3 text-sm font-bold uppercase tracking-widest mt-2">
            Entrar no Sistema
          </button>
        </form>

        <p className="text-center text-[#4a6a8a] text-[10px] font-mono">
          &copy; {new Date().getFullYear()} SILO OPS &mdash; SILO OPS v0.1.0-enterprise
        </p>
      </div>
    </div>
  );
}
