import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import TopBar from "@/components/TopBar";
import PlayerTable from "@/components/PlayerTable";
import { useDashboard } from "./DashboardLayout";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Calendar as CalIcon, X } from "lucide-react";

function fmtDate(d) {
    return d.toISOString().slice(0, 10);
}

export default function History() {
    const { clans } = useDashboard();
    const [params, setParams] = useSearchParams();
    const initialClan = params.get("clan") || "";
    const [clanId, setClanId] = useState(initialClan);
    const [snaps, setSnaps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState(null);

    useEffect(() => {
        if (!clanId && clans.length > 0) setClanId(clans[0].id);
    }, [clans, clanId]);

    const load = useCallback(async () => {
        if (!clanId) return;
        setLoading(true);
        try {
            const q = date ? `?date=${fmtDate(date)}` : "";
            const { data } = await api.get(`/clans/${clanId}/history${q}`);
            setSnaps(data?.snapshots || []);
        } catch (e) {
            // ignore
        } finally {
            setLoading(false);
        }
    }, [clanId, date]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (clanId) setParams({ clan: clanId });
    }, [clanId, setParams]);

    const grouped = useMemo(() => {
        const m = {};
        snaps.forEach((s) => {
            const key = s.snapshot_date;
            (m[key] = m[key] || []).push(s);
        });
        return Object.entries(m).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    }, [snaps]);

    const selectedClan = clans.find((c) => c.id === clanId);

    return (
        <>
            <TopBar title="Geçmiş" subtitle="Günlük Kayıtlar" />
            <div className="p-6 lg:p-8 max-w-[1600px]">
                <div className="flex flex-wrap items-end gap-3 mb-6">
                    <div className="space-y-1.5 min-w-[240px]">
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                            Klan
                        </div>
                        <Select value={clanId} onValueChange={setClanId}>
                            <SelectTrigger
                                data-testid="history-clan-select"
                                className="bg-[#141414] border-white/10 text-white"
                            >
                                <SelectValue placeholder="Klan seçin" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#141414] border-white/10 text-zinc-200">
                                {clans.map((c) => (
                                    <SelectItem
                                        key={c.id}
                                        value={c.id}
                                        data-testid={`history-clan-option-${c.id}`}
                                    >
                                        {c.name} · {c.tag}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                            Tarih Filtresi
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    data-testid="history-date-picker"
                                    className="bg-[#141414] border-white/10 text-zinc-200 hover:bg-white/5 gap-2"
                                >
                                    <CalIcon className="w-4 h-4" />
                                    {date ? fmtDate(date) : "Tüm tarihler"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="bg-[#141414] border-white/10 text-zinc-200 p-0 w-auto">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    {date && (
                        <Button
                            type="button"
                            variant="outline"
                            data-testid="history-clear-date"
                            onClick={() => setDate(null)}
                            className="bg-transparent border-white/10 text-zinc-300 hover:bg-white/5 gap-1.5"
                        >
                            <X className="w-3.5 h-3.5" /> Temizle
                        </Button>
                    )}
                </div>

                {!selectedClan ? (
                    <div className="border border-dashed border-white/10 rounded-md p-12 text-center text-zinc-500 text-sm">
                        Önce bir klan seçin.
                    </div>
                ) : loading ? (
                    <div className="text-zinc-500 text-sm font-mono">Yükleniyor...</div>
                ) : grouped.length === 0 ? (
                    <div className="border border-dashed border-white/10 rounded-md p-12 text-center">
                        <div className="text-zinc-300 font-semibold mb-1">Geçmiş kayıt yok</div>
                        <div className="text-zinc-500 text-sm">
                            Senkronizasyon yapıldıkça günlük kayıtlar burada görünecek.
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8" data-testid="history-list">
                        {grouped.map(([day, items]) =>
                            items.map((s) => (
                                <div key={`${day}-${s.period_index}`} data-testid={`history-day-${day}`}>
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                                        <div>
                                            <div className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-500">
                                                {selectedClan.name}
                                            </div>
                                            <div className="text-xl font-bold text-white tracking-tight">
                                                {day}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs font-mono">
                                            <Pill label="Periyot" value={s.period_index ?? "—"} />
                                            <Pill label="Tip" value={s.period_type || "—"} />
                                            <Pill label="Durum" value={s.war_state || "—"} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                                        <MiniStat label="Madalyon" value={s.total_fame?.toLocaleString("tr-TR") || 0} accent="text-yellow-400" />
                                        <MiniStat label="Deste" value={s.total_decks_used || 0} />
                                        <MiniStat label="Oyuncu" value={s.participants?.length || 0} />
                                        <MiniStat label="Tam" value={s.full_count || 0} accent="text-emerald-400" />
                                        <MiniStat label="Yarım" value={s.partial_count || 0} accent="text-amber-400" />
                                        <MiniStat label="Yok" value={s.none_count || 0} accent="text-rose-400" />
                                    </div>
                                    <PlayerTable participants={s.participants || []} />
                                </div>
                            )),
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

function Pill({ label, value }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className="text-zinc-500 uppercase tracking-wider text-[10px]">{label}</span>
            <span className="text-zinc-200">{String(value)}</span>
        </span>
    );
}

function MiniStat({ label, value, accent = "text-white" }) {
    return (
        <div className="bg-[#141414] border border-white/10 p-3 rounded-md">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-1">
                {label}
            </div>
            <div className={`text-xl font-black font-mono tabular-nums ${accent}`}>
                {value}
            </div>
        </div>
    );
}
