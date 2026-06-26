import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

function timeAgo(iso) {
    if (!iso) return "Henüz yok";
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 5) return "Az önce";
    if (diff < 60) return `${diff} sn önce`;
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
}

export default function TopBar({ title, subtitle, onSyncDone }) {
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);

    const loadStatus = async () => {
        try {
            const { data } = await api.get("/sync/status");
            setStatus(data);
        } catch (e) {
            // ignore
        }
    };

    useEffect(() => {
        loadStatus();
        const t = setInterval(loadStatus, 30000);
        return () => clearInterval(t);
    }, []);

    const syncAll = async () => {
        setBusy(true);
        try {
            const { data } = await api.post("/sync/all");
            setStatus(data);
            toast.success(`Senkronizasyon tamam · ${data.success} ok / ${data.failed} hata`);
            onSyncDone?.();
        } catch (e) {
            toast.error("Senkronizasyon başarısız");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            data-testid="top-bar"
            className="flex items-center justify-between border-b border-white/10 px-6 lg:px-8 py-4 bg-[#0A0A0A] sticky top-0 z-10"
        >
            <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">
                    {subtitle || "Operasyon"}
                </div>
                <h1
                    data-testid="page-title"
                    className="text-xl md:text-2xl font-bold text-white tracking-tight"
                >
                    {title}
                </h1>
            </div>
            <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                        Son senkronizasyon
                    </div>
                    <div
                        data-testid="last-sync-time"
                        className="text-xs text-zinc-300 font-mono"
                    >
                        {timeAgo(status?.last_run)}
                        {status?.last_run && (
                            <span className="ml-2 text-zinc-600">
                                · {status?.success || 0} ok / {status?.failed || 0} hata
                            </span>
                        )}
                    </div>
                </div>
                <Button
                    type="button"
                    onClick={syncAll}
                    disabled={busy}
                    data-testid="manual-sync-all-btn"
                    className="bg-blue-600 hover:bg-blue-500 text-white h-9 gap-2"
                >
                    {busy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                    Senkronize Et
                </Button>
            </div>
        </div>
    );
}
