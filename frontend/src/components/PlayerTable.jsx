import { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, ExternalLink, ArrowUpDown } from "lucide-react";

function StatusBadge({ status }) {
    if (status === "full") {
        return (
            <span
                data-testid="status-full"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
            >
                <CheckCircle2 className="w-3 h-3" /> Tam
            </span>
        );
    }
    if (status === "partial") {
        return (
            <span
                data-testid="status-partial"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 border-amber-400/20"
            >
                <AlertTriangle className="w-3 h-3" /> Yarım
            </span>
        );
    }
    return (
        <span
            data-testid="status-none"
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 border-rose-500/20"
        >
            <XCircle className="w-3 h-3" /> Yok
        </span>
    );
}

export default function PlayerTable({ participants = [] }) {
    const [sortBy, setSortBy] = useState({ key: "fame", dir: "desc" });

    const sorted = useMemo(() => {
        const arr = [...participants];
        arr.sort((a, b) => {
            const av = a[sortBy.key];
            const bv = b[sortBy.key];
            if (typeof av === "number" && typeof bv === "number") {
                return sortBy.dir === "asc" ? av - bv : bv - av;
            }
            return sortBy.dir === "asc"
                ? String(av || "").localeCompare(String(bv || ""))
                : String(bv || "").localeCompare(String(av || ""));
        });
        return arr;
    }, [participants, sortBy]);

    const toggleSort = (key) =>
        setSortBy((s) =>
            s.key === key
                ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
                : { key, dir: "desc" },
        );

    const H = ({ k, children, right }) => (
        <th
            onClick={() => toggleSort(k)}
            className={`px-4 py-3 text-xs font-mono tracking-[0.1em] uppercase text-zinc-500 bg-[#0F0F0F] border-b border-white/10 cursor-pointer select-none hover:text-zinc-300 ${right ? "text-right" : "text-left"}`}
        >
            <span className="inline-flex items-center gap-1.5">
                {children}
                <ArrowUpDown className="w-3 h-3 opacity-40" />
            </span>
        </th>
    );

    return (
        <div className="w-full overflow-x-auto rounded-md border border-white/10 bg-[#141414]">
            <table className="min-w-full text-sm" data-testid="player-table">
                <thead>
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider text-zinc-500 bg-[#0F0F0F] border-b border-white/10 w-12">
                            #
                        </th>
                        <H k="name">Oyuncu</H>
                        <H k="fame" right>
                            Madalyon
                        </H>
                        <H k="decks_used_today" right>
                            Bugün Deste
                        </H>
                        <H k="decks_used" right>
                            Toplam Deste
                        </H>
                        <th className="px-4 py-3 text-center text-xs font-mono uppercase tracking-wider text-zinc-500 bg-[#0F0F0F] border-b border-white/10">
                            Katılım
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.length === 0 && (
                        <tr>
                            <td
                                colSpan={6}
                                className="px-4 py-8 text-center text-zinc-500 text-sm"
                            >
                                Henüz veri yok. Senkronize edin.
                            </td>
                        </tr>
                    )}
                    {sorted.map((p, idx) => {
                        const profileUrl = `https://royaleapi.com/player/${(p.tag || "").replace("#", "")}`;
                        return (
                            <tr
                                key={p.tag || idx}
                                data-testid={`player-row-${p.tag}`}
                                className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                            >
                                <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                                    {idx + 1}
                                </td>
                                <td className="px-4 py-3">
                                    <a
                                        href={profileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        data-testid={`player-link-${p.tag}`}
                                        className="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1.5 font-medium"
                                    >
                                        {p.name}
                                        <ExternalLink className="w-3 h-3 opacity-60" />
                                    </a>
                                    <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                                        {p.tag}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-zinc-100 tabular-nums">
                                    {p.fame.toLocaleString("tr-TR")}
                                </td>
                                <td className="px-4 py-3 text-right font-mono tabular-nums">
                                    <span className="text-zinc-200">{p.decks_used_today}</span>
                                    <span className="text-zinc-600">/4</span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-zinc-300 tabular-nums">
                                    {p.decks_used}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <StatusBadge status={p.status} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
