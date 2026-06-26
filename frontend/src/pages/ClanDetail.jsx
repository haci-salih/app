import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import TopBar from "@/components/TopBar";
import PlayerTable from "@/components/PlayerTable";
import { useDashboard } from "./DashboardLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, History, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

function StatePill({ state }) {
    const map = {
        warDay: ["Savaş Günü", "text-rose-400 bg-rose-500/10 border-rose-500/20"],
        preparation: ["Hazırlık Günü", "text-amber-400 bg-amber-400/10 border-amber-400/20"],
        matchmaking: ["Eşleşme", "text-blue-400 bg-blue-500/10 border-blue-500/20"],
        full: ["Aktif Savaş", "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"],
        notInWar: ["Savaşta Değil", "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"],
    };
    const [label, cls] = map[state] || ["—", "text-zinc-500 bg-zinc-500/10 border-zinc-500/20"];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-bold uppercase tracking-wider ${cls}`}>
            {label}
        </span>
    );
}

export default function ClanDetail() {
    const { id } = useParams();
    const { refresh } = useDashboard();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await api.get(`/clans/${id}/current`);
            setData(data);
        } catch (e) {
            toast.error("Veri alınamadı");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        setLoading(true);
        load();
    }, [load]);

    const sync = async () => {
        setSyncing(true);
        try {
            await api.post(`/clans/${id}/sync`);
            await load();
            await refresh();
            toast.success("Klan senkronize edildi");
        } catch (e) {
            const msg = e?.response?.data?.detail;
            toast.error(typeof msg === "string" ? msg : "Senkronizasyon başarısız");
        } finally {
            setSyncing(false);
        }
    };

    const clan = data?.clan;
    const snap = data?.snapshot;
    const participants = snap?.participants || [];

    return (
        <>
            <TopBar
                title={clan?.name || "Klan"}
                subtitle={clan?.tag || ""}
                onSyncDone={() => {
                    load();
                    refresh();
                }}
            />
            <div className="p-6 lg:p-8 max-w-[1600px]">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <Link
                            to="/"
                            data-testid="back-to-overview"
                            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.18em] text-zinc-500 hover:text-zinc-300"
                        >
                            <ArrowLeft className="w-3 h-3" /> Genel Görünüm
                        </Link>
                        {snap && <StatePill state={snap.war_state} />}
                        {snap?.period_type && (
                            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                                Periyot {snap.period_index ?? "—"} · {snap.period_type}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Link to={`/history?clan=${id}`}>
                            <Button
                                variant="outline"
                                data-testid="open-history-btn"
                                className="bg-transparent border-white/10 hover:bg-white/5 text-zinc-200 h-9 gap-2"
                            >
                                <History className="w-4 h-4" /> Geçmiş
                            </Button>
                        </Link>
                        <Button
                            data-testid="clan-sync-btn"
                            onClick={sync}
                            disabled={syncing}
                            className="bg-blue-600 hover:bg-blue-500 text-white h-9 gap-2"
                        >
                            {syncing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                            Senkronize Et
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-zinc-500 text-sm font-mono">Yükleniyor...</div>
                ) : !snap ? (
                    <div className="border border-dashed border-white/10 rounded-md p-12 text-center">
                        <div className="text-zinc-300 font-semibold mb-1">Henüz veri yok</div>
                        <div className="text-zinc-500 text-sm">"Senkronize Et" butonuna basın.</div>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6" data-testid="clan-stats">
                            <Stat label="Toplam Madalyon" value={snap.total_fame?.toLocaleString("tr-TR") || 0} accent="text-yellow-400" />
                            <Stat label="Kullanılan Deste" value={snap.total_decks_used || 0} />
                            <Stat label="Oyuncular" value={participants.length} />
                            <Stat label="Tamamlayan" value={snap.full_count || 0} accent="text-emerald-400" />
                            <Stat label="Yarım" value={snap.partial_count || 0} accent="text-amber-400" />
                            <Stat label="Yapmayan" value={snap.none_count || 0} accent="text-rose-400" />
                        </div>

                        <div className="flex items-center justify-between mb-3">
                            <div className="text-xs uppercase tracking-[0.25em] text-zinc-500 font-mono">
                                Oyuncu Katılımı · {snap.snapshot_date}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500">
                                Anlık görüntü kaydedildi: {snap.saved_at ? new Date(snap.saved_at).toLocaleString("tr-TR") : "—"}
                            </div>
                        </div>
                        <PlayerTable participants={participants} />
                    </>
                )}
            </div>
        </>
    );
}

function Stat({ label, value, accent = "text-white" }) {
    return (
        <div className="bg-[#141414] border border-white/10 p-4 rounded-md">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
                {label}
            </div>
            <div className={`text-2xl font-black font-mono tabular-nums ${accent}`}>
                {value}
            </div>
        </div>
    );
}
