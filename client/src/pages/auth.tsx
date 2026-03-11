import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Eye, EyeOff, Gamepad2, Wallet, Shield, MessageSquare, Github, Phone, Chrome } from "lucide-react";
import {
  storeAuth,
  loginWithPassword,
  registerAccount,
  loginAsGuest,
  loginWithGoogle,
  loginWithWallet,
  sendPhoneCode,
  verifyPhoneCode,
} from "@/lib/auth";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const returnUrl = new URLSearchParams(search).get("return") || "/";

  // Form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [phone, setPhoneNum] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  // Loading / error
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSuccess = () => {
    navigate(returnUrl, { replace: true });
  };

  const handleError = (msg: string) => {
    setError(msg);
    setLoading(null);
  };

  // ── Quick Play (Guest) ──
  const handleGuest = async () => {
    setLoading("guest");
    setError(null);
    try {
      const res = await loginAsGuest();
      if (res.success) return onSuccess();
      handleError(res.error || "Guest login failed — auth gateway may be down");
    } catch {
      handleError("Guest login failed — unable to reach server");
    }
  };

  // ── Username / Password Login ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) return handleError("Username and password required");
    setLoading("login");
    setError(null);
    try {
      const res = await loginWithPassword(loginUsername, loginPassword);
      if (res.success) return onSuccess();
      handleError(res.error || "Login failed");
    } catch {
      handleError("Login failed — server unreachable");
    }
  };

  // ── Register ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPassword) return handleError("Username and password required");
    setLoading("register");
    setError(null);
    try {
      const res = await registerAccount(regUsername, regPassword, regEmail || undefined);
      if (res.success) return onSuccess();
      handleError(res.error || "Registration failed");
    } catch {
      handleError("Registration failed — server unreachable");
    }
  };

  // ── Puter Sign-In ──
  const handlePuter = async () => {
    setLoading("puter");
    setError(null);
    try {
      if (!window.puter) {
        return handleError("Puter SDK not loaded");
      }
      await window.puter.auth.signIn();
      const user = await window.puter.auth.getUser();
      if (!user?.uuid) return handleError("Puter sign-in failed");
      const res = await fetch("/api/auth/puter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puterUuid: user.uuid, puterUsername: user.username }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        storeAuth({ ...data, isPuter: true });
        return onSuccess();
      }
      handleError(data.error || "Puter authentication failed");
    } catch {
      handleError("Puter sign-in failed");
    }
  };

  // ── OAuth (Discord, GitHub, Google) ──
  const handleOAuth = async (provider: "discord" | "github" | "google") => {
    setLoading(provider);
    setError(null);
    try {
      if (provider === "google") {
        await loginWithGoogle(window.location.origin + `/auth?return=${encodeURIComponent(returnUrl)}`);
        return;
      }
      const res = await fetch(`/api/auth/${provider}?state=${encodeURIComponent(window.location.origin + `/auth?return=${encodeURIComponent(returnUrl)}`)}`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      handleError(data.error || `${provider} auth failed`);
    } catch {
      handleError(`${provider} auth failed`);
    }
  };

  // ── Wallet ──
  const handleWallet = async () => {
    setLoading("wallet");
    setError(null);
    try {
      const solana = (window as any).solana || (window as any).phantom?.solana;
      if (!solana) return handleError("No Solana wallet found — install Phantom");
      await solana.connect();
      const address = solana.publicKey?.toString();
      if (!address) return handleError("Wallet connection failed");
      const res = await loginWithWallet(address);
      if (res.success) return onSuccess();
      handleError(res.error || "Wallet auth failed");
    } catch {
      handleError("Wallet connection failed");
    }
  };

  // ── Phone ──
  const handleSendCode = async () => {
    if (!phone) return handleError("Phone number required");
    setLoading("phone-send");
    setError(null);
    try {
      const res = await sendPhoneCode(phone);
      if (res.success) {
        setCodeSent(true);
        setLoading(null);
      } else {
        handleError(res.error || "Failed to send code");
      }
    } catch {
      handleError("Failed to send verification code");
    }
  };

  const handleVerifyCode = async () => {
    if (!phoneCode) return handleError("Verification code required");
    setLoading("phone-verify");
    setError(null);
    try {
      const res = await verifyPhoneCode(phone, phoneCode);
      if (res.success) return onSuccess();
      handleError(res.error || "Invalid code");
    } catch {
      handleError("Verification failed");
    }
  };

  const isLoading = (key: string) => loading === key;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 p-4">
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFhMWExYSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="w-full bg-stone-900/95 border-stone-700 shadow-2xl">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <CardTitle className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800 font-serif mb-1">
                GRUDGE
              </CardTitle>
              <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-900 font-serif">
                WARLORDS
              </p>
              <CardDescription className="text-stone-400 mt-2">
                Your GRUDGE ID is your gaming passport
              </CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-red-400 text-sm text-center bg-red-900/20 py-2 px-4 rounded"
              >
                {error}
              </motion.div>
            )}

            {/* Quick Play (Guest) */}
            <Button
              onClick={handleGuest}
              disabled={!!loading}
              className="w-full gap-2 bg-red-900 hover:bg-red-800 text-white font-semibold h-12 text-base"
            >
              {isLoading("guest") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gamepad2 className="h-5 w-5" />}
              Quick Play
            </Button>

            {/* Sign-in providers */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                onClick={handleWallet}
                disabled={!!loading}
                className="border-stone-600 hover:bg-stone-800 flex flex-col items-center gap-1 h-auto py-3 text-stone-300"
                title="Connect Wallet"
              >
                {isLoading("wallet") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-5 w-5 text-amber-400" />}
                <span className="text-[10px]">Wallet</span>
              </Button>
              <Button
                variant="outline"
                onClick={handlePuter}
                disabled={!!loading}
                className="border-stone-600 hover:bg-stone-800 flex flex-col items-center gap-1 h-auto py-3 text-stone-300"
                title="Sign in with Puter"
              >
                {isLoading("puter") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-5 w-5 text-green-400" />}
                <span className="text-[10px]">Puter</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOAuth("discord")}
                disabled={!!loading}
                className="border-stone-600 hover:bg-stone-800 flex flex-col items-center gap-1 h-auto py-3 text-stone-300"
                title="Sign in with Discord"
              >
                {isLoading("discord") ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-5 w-5 text-indigo-400" />}
                <span className="text-[10px]">Discord</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOAuth("google")}
                disabled={!!loading}
                className="border-stone-600 hover:bg-stone-800 flex flex-col items-center gap-1 h-auto py-3 text-stone-300"
                title="Sign in with Google"
              >
                {isLoading("google") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Chrome className="h-5 w-5 text-blue-400" />}
                <span className="text-[10px]">Google</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => handleOAuth("github")}
                disabled={!!loading}
                className="border-stone-600 hover:bg-stone-800 text-stone-300 gap-2"
              >
                {isLoading("github") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
                GitHub
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const el = document.getElementById("phone-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                disabled={!!loading}
                className="border-stone-600 hover:bg-stone-800 text-stone-300 gap-2"
              >
                <Phone className="h-4 w-4" />
                Phone
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Separator className="flex-1 bg-stone-700" />
              <span className="text-xs text-stone-500">OR CONTINUE WITH</span>
              <Separator className="flex-1 bg-stone-700" />
            </div>

            {/* Username / Password */}
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-stone-800">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleLogin} className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-stone-300 text-xs uppercase tracking-wider">Username / Email / GRUDGE ID</Label>
                    <Input
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      disabled={!!loading}
                      className="bg-stone-800 border-stone-600 text-stone-100 placeholder:text-stone-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-stone-300 text-xs uppercase tracking-wider">Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        disabled={!!loading}
                        className="bg-stone-800 border-stone-600 text-stone-100 placeholder:text-stone-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={!!loading}
                    className="w-full bg-red-900 hover:bg-red-800 text-white"
                  >
                    {isLoading("login") ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    SIGN IN
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-4">
                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-stone-300 text-xs uppercase tracking-wider">Username</Label>
                    <Input
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      disabled={!!loading}
                      className="bg-stone-800 border-stone-600 text-stone-100 placeholder:text-stone-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-stone-300 text-xs uppercase tracking-wider">Email (Optional)</Label>
                    <Input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      disabled={!!loading}
                      className="bg-stone-800 border-stone-600 text-stone-100 placeholder:text-stone-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-stone-300 text-xs uppercase tracking-wider">Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        disabled={!!loading}
                        className="bg-stone-800 border-stone-600 text-stone-100 placeholder:text-stone-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={!!loading}
                    className="w-full bg-green-800 hover:bg-green-700 text-white"
                  >
                    {isLoading("register") ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    CREATE ACCOUNT
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Phone Section */}
            <div id="phone-section" className="space-y-3 pt-2">
              <Separator className="bg-stone-700" />
              <p className="text-xs text-stone-500 text-center uppercase tracking-wider">Phone Verification</p>
              <Input
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhoneNum(e.target.value)}
                disabled={!!loading}
                className="bg-stone-800 border-stone-600 text-stone-100 placeholder:text-stone-500"
              />
              {codeSent && (
                <Input
                  placeholder="Verification Code"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  disabled={!!loading}
                  className="bg-stone-800 border-stone-600 text-stone-100 placeholder:text-stone-500"
                />
              )}
              <Button
                onClick={codeSent ? handleVerifyCode : handleSendCode}
                disabled={!!loading}
                variant="outline"
                className="w-full border-stone-600 text-stone-300 hover:bg-stone-800"
              >
                {(isLoading("phone-send") || isLoading("phone-verify")) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {codeSent ? "Verify Code" : "Send Code"}
              </Button>
            </div>

            {/* Footer */}
            <p className="text-stone-600 text-xs text-center pt-2">
              Your GRUDGE ID works across all GRUDGE games. Sign in with Puter for Premium features.
            </p>
            <div className="text-stone-600 text-xs text-center pt-1">
              <a href="/privacy" className="hover:text-stone-400 underline">Privacy Policy</a>
              <span className="mx-2">·</span>
              <a href="/tos" className="hover:text-stone-400 underline">Terms of Service</a>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
