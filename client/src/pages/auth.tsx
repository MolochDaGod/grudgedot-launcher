import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { captureAuthCallback, getAuthData } from "@/lib/auth";

declare global {
  interface Window {
    openGrudgeAuthModal?: () => void;
    grudgeAuthIsLoggedIn?: () => boolean;
  }
}

export default function AuthPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const returnUrl = params.get("return") || "/";

  useEffect(() => {
    // Capture token from OAuth callback redirect (?token=...&grudgeId=...)
    if (params.get("token")) {
      const captured = captureAuthCallback();
      if (captured) {
        navigate(returnUrl, { replace: true });
        return;
      }
    }

    // If user is already logged in, skip auth page
    const existing = getAuthData();
    if (existing || window.grudgeAuthIsLoggedIn?.()) {
      navigate(returnUrl, { replace: true });
      return;
    }

    // Listen for auth success from the Grudge Auth Modal
    const onAuthSuccess = () => {
      navigate(returnUrl, { replace: true });
    };
    window.addEventListener("grudge:auth:success", onAuthSuccess);

    // Auto-open the auth modal
    const timer = setTimeout(() => {
      window.openGrudgeAuthModal?.();
    }, 400);

    return () => {
      window.removeEventListener("grudge:auth:success", onAuthSuccess);
      clearTimeout(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 p-4 relative overflow-hidden">
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFhMWExYSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center"
      >
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800 font-serif mb-1">
          GRUDGE
        </h1>
        <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-900 font-serif mb-2">
          WARLORDS
        </p>
        <p className="text-stone-400 text-sm mb-8">
          Your GRUDGE ID is your gaming passport
        </p>

        <button
          onClick={() => window.openGrudgeAuthModal?.()}
          className="px-8 py-3 rounded-lg font-bold tracking-wider text-stone-950 font-serif"
          style={{
            background: 'linear-gradient(135deg, #DB6331, #FAAC47)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.95rem',
            letterSpacing: '0.1em',
            boxShadow: '0 4px 24px rgba(250,172,71,0.3)',
          }}
        >
          SIGN IN WITH GRUDGE ID
        </button>

        <div className="text-stone-600 text-xs mt-8">
          <a href="/privacy" className="hover:text-stone-400 underline">Privacy Policy</a>
          <span className="mx-2">·</span>
          <a href="/tos" className="hover:text-stone-400 underline">Terms of Service</a>
        </div>
      </motion.div>
    </div>
  );
}
