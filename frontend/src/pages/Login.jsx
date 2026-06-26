import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2 } from "lucide-react";

export default function Login() {
    const { login } = useAuth();
    const nav = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setErr("");
        setBusy(true);
        try {
            await login(username, password);
            nav("/", { replace: true });
        } catch (e2) {
            const msg = e2?.response?.data?.detail;
            setErr(typeof msg === "string" ? msg : "Giriş başarısız");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center relative bg-[#0a0a0a]"
            style={{
                backgroundImage:
                    "url('https://images.pexels.com/photos/6485524/pexels-photo-6485524.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940')",
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

            <div className="relative z-10 w-full max-w-md px-6">
                <div className="mb-8 flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <div className="text-xs font-mono uppercase tracking-[0.3em] text-zinc-500">
                            Komuta Merkezi
                        </div>
                        <div className="font-bold text-white text-lg tracking-tight">
                            Klan Savaşı Takibi
                        </div>
                    </div>
                </div>

                <form
                    onSubmit={submit}
                    data-testid="login-form"
                    className="bg-[#141414]/95 backdrop-blur-xl border border-white/10 rounded-lg p-8 shadow-2xl space-y-5"
                >
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1">
                            Giriş Yap
                        </h1>
                        <p className="text-sm text-zinc-400">
                            Devam etmek için kimlik bilgilerinizi girin.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label
                            htmlFor="username"
                            className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-mono"
                        >
                            Kullanıcı Adı
                        </Label>
                        <Input
                            id="username"
                            data-testid="login-username-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="bg-black/60 border-white/10 text-white focus-visible:ring-blue-500/40"
                            autoComplete="username"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label
                            htmlFor="password"
                            className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-mono"
                        >
                            Şifre
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            data-testid="login-password-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-black/60 border-white/10 text-white focus-visible:ring-blue-500/40"
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    {err && (
                        <div
                            data-testid="login-error"
                            className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2"
                        >
                            {err}
                        </div>
                    )}

                    <Button
                        type="submit"
                        data-testid="login-submit-button"
                        disabled={busy}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold tracking-wide"
                    >
                        {busy ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            "Giriş Yap"
                        )}
                    </Button>

                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600 text-center pt-2">
                        v1.0 · clan command center
                    </div>
                </form>
            </div>
        </div>
    );
}
