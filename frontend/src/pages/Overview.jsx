import { Link } from "react-router-dom";
import TopBar from "@/components/TopBar";
import { useDashboard } from "./DashboardLayout";
import { Shield, ChevronRight, Activity } from "lucide-react";

function StateBadge({ state }) {
    const map = {
        warDay: { label: "Savaş Günü", cls: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
        preparation: { label: "Hazırlık", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
        matchmaking: { label: "Eşleşme", cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
        full: { label: "Aktif", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
        notInWar: { label: "Savaşta Değil", cls: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20" },
    };
    const m = map[state] || { label: state || "—", cls: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20" };
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${m.cls}`}
        >
            <Activity className="w-3 h-3" />
            {m.label}
        </span>
    );
}

export default function Overview() {
    const { clans, folders, refresh } = useDashboard();

    return (
        <>
            <TopBar
                title="Genel Görünüm"
                subtitle="Komuta Merkezi"
                onSyncDone={refresh}
            />
            <div className="p-6 lg:p-8 max-w-[1600px]">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Stat label="Takip Edilen Klan" value={clans.length} />
                    <Stat label="Klasör Sayısı" value={folders.length} />
                    <Stat
                        label="Aktif Savaş"
                        value={clans.filter((c) => c.war_state === "warDay" || c.war_state === "full").length}
                    />
                    <Stat
                        label="Hazırlık"
                        value={clans.filter((c) => c.war_state === "preparation" || c.war_state === "matchmaking").length}
                    />
                </div>

                <div className="text-xs uppercase tracking-[0.25em] text-zinc-500 font-mono mb-3">
                    Klan Listesi
                </div>

                {clans.length === 0 ? (
                    <div className="border border-dashed border-white/10 rounded-md p-12 text-center">
                        <Shield className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
                        <div className="text-zinc-300 font-semibold mb-1">Henüz klan yok</div>
                        <div className="text-zinc-500 text-sm">
                            Sol menüden "Klan Ekle" diyerek başlayın.
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="clan-grid">
                        {clans.map((c) => {
                            const folder = folders.find((f) => f.id === c.folder_id);
                            return (
                                <Link
                                    key={c.id}
                                    to={`/clans/${c.id}`}
                                    data-testid={`clan-card-${c.id}`}
                                    className="group bg-[#141414] border border-white/10 rounded-md p-5 hover:border-blue-500/40 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 truncate">
                                                {folder?.name || "Klasörsüz"}
                                            </div>
                                            <div className="text-lg font-bold text-white truncate">
                                                {c.name}
                                            </div>
                                            <div className="text-[11px] font-mono text-zinc-500">
                                                {c.tag}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 transition-colors shrink-0" />
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                        <StateBadge state={c.war_state} />
                                        <div className="text-[10px] font-mono text-zinc-500">
                                            {c.last_synced
                                                ? new Date(c.last_synced).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })
                                                : "henüz senkronize edilmedi"}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}

function Stat({ label, value }) {
    return (
        <div className="bg-[#141414] border border-white/10 p-5 rounded-md">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-2">
                {label}
            </div>
            <div className="text-3xl font-black text-white font-mono tabular-nums">
                {value}
            </div>
        </div>
    );
}
