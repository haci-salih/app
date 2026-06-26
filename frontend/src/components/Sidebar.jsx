import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
    Folder as FolderIcon,
    FolderPlus,
    Plus,
    Shield,
    LogOut,
    History,
    LayoutDashboard,
    Trash2,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AddClanDialog from "./AddClanDialog";
import AddFolderDialog from "./AddFolderDialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function Sidebar({ folders, clans, onRefresh }) {
    const { logout, user } = useAuth();
    const loc = useLocation();
    const [openClan, setOpenClan] = useState(false);
    const [openFolder, setOpenFolder] = useState(false);
    const [collapsed, setCollapsed] = useState({});

    useEffect(() => {
        // expand all by default once folders load
        const init = {};
        folders?.forEach((f) => (init[f.id] = true));
        init["__none__"] = true;
        setCollapsed(init);
    }, [folders?.length]);

    const toggle = (id) =>
        setCollapsed((c) => ({ ...c, [id]: !c[id] }));

    const deleteClan = async (id) => {
        try {
            await api.delete(`/clans/${id}`);
            toast.success("Klan silindi");
            onRefresh();
        } catch (e) {
            toast.error("Silinemedi");
        }
    };

    const deleteFolder = async (id) => {
        try {
            await api.delete(`/folders/${id}`);
            toast.success("Klasör silindi");
            onRefresh();
        } catch (e) {
            const msg = e?.response?.data?.detail || "Silinemedi";
            toast.error(typeof msg === "string" ? msg : "Silinemedi");
        }
    };

    const clansByFolder = (folderId) =>
        clans.filter((c) => (folderId === "__none__" ? !c.folder_id : c.folder_id === folderId));

    const renderFolderGroup = (folder, isDefault) => {
        const id = folder?.id || "__none__";
        const name = folder?.name || "Klasörsüz";
        const items = clansByFolder(id);
        const open = collapsed[id];
        return (
            <div key={id} className="mb-1">
                <div className="group flex items-center justify-between py-2 px-3 text-xs font-mono uppercase tracking-[0.18em] text-zinc-500 hover:text-zinc-300 cursor-pointer">
                    <button
                        type="button"
                        data-testid={`folder-toggle-${id}`}
                        onClick={() => toggle(id)}
                        className="flex items-center gap-2 flex-1 text-left"
                    >
                        {open ? (
                            <ChevronDown className="w-3 h-3" />
                        ) : (
                            <ChevronRight className="w-3 h-3" />
                        )}
                        <FolderIcon className="w-3.5 h-3.5" />
                        <span className="truncate">{name}</span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-zinc-500">{items.length}</span>
                    </button>
                    {folder && !isDefault && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <button
                                    type="button"
                                    data-testid={`folder-delete-${id}`}
                                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#141414] border-white/10 text-zinc-200">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Klasör silinsin mi?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-zinc-400">
                                        Klasör silindiğinde içindeki klanlar "Klasörsüz" altına taşınır.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-transparent border-white/10 text-zinc-300 hover:bg-white/5">
                                        İptal
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        data-testid={`folder-delete-confirm-${id}`}
                                        onClick={() => deleteFolder(id)}
                                        className="bg-rose-600 hover:bg-rose-500"
                                    >
                                        Sil
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
                {open && (
                    <div className="space-y-0.5 pb-1">
                        {items.length === 0 && (
                            <div className="pl-10 pr-3 py-1.5 text-[11px] text-zinc-600 font-mono">
                                Boş
                            </div>
                        )}
                        {items.map((c) => {
                            const active = loc.pathname === `/clans/${c.id}`;
                            return (
                                <div
                                    key={c.id}
                                    className={`group flex items-center gap-2 mx-2 pl-7 pr-2 py-1.5 rounded text-sm transition-colors ${active ? "bg-blue-600/15 text-white" : "text-zinc-300 hover:bg-white/5"}`}
                                >
                                    <Link
                                        to={`/clans/${c.id}`}
                                        data-testid={`sidebar-clan-${c.id}`}
                                        className="flex-1 truncate"
                                    >
                                        <span className="font-medium">{c.name}</span>
                                        <span className="ml-2 text-[10px] font-mono text-zinc-500">{c.tag}</span>
                                    </Link>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <button
                                                type="button"
                                                data-testid={`clan-delete-${c.id}`}
                                                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-[#141414] border-white/10 text-zinc-200">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Klan silinsin mi?</AlertDialogTitle>
                                                <AlertDialogDescription className="text-zinc-400">
                                                    {c.name} ({c.tag}) ve tüm geçmiş kayıtları silinecek.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="bg-transparent border-white/10 text-zinc-300 hover:bg-white/5">
                                                    İptal
                                                </AlertDialogCancel>
                                                <AlertDialogAction
                                                    data-testid={`clan-delete-confirm-${c.id}`}
                                                    onClick={() => deleteClan(c.id)}
                                                    className="bg-rose-600 hover:bg-rose-500"
                                                >
                                                    Sil
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <aside
            data-testid="sidebar"
            className="w-[280px] shrink-0 border-r border-white/10 h-screen sticky top-0 bg-[#0A0A0A] flex flex-col"
        >
            <div className="px-5 pt-5 pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded bg-blue-600/15 border border-blue-500/30 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="leading-tight">
                        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">
                            Komuta Merkezi
                        </div>
                        <div className="font-bold text-white text-sm tracking-tight">
                            Klan Savaşı
                        </div>
                    </div>
                </div>
            </div>

            <nav className="px-2 py-3 border-b border-white/10 space-y-0.5">
                <Link
                    to="/"
                    data-testid="nav-overview"
                    className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors ${loc.pathname === "/" ? "bg-blue-600/15 text-white" : "text-zinc-300 hover:bg-white/5"}`}
                >
                    <LayoutDashboard className="w-4 h-4" />
                    Genel Görünüm
                </Link>
                <Link
                    to="/history"
                    data-testid="nav-history"
                    className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors ${loc.pathname.startsWith("/history") ? "bg-blue-600/15 text-white" : "text-zinc-300 hover:bg-white/5"}`}
                >
                    <History className="w-4 h-4" />
                    Geçmiş
                </Link>
            </nav>

            <div className="px-3 py-3 border-b border-white/10 flex items-center gap-2">
                <Button
                    type="button"
                    onClick={() => setOpenClan(true)}
                    data-testid="sidebar-add-clan-btn"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 gap-1.5"
                >
                    <Plus className="w-3.5 h-3.5" /> Klan Ekle
                </Button>
                <Button
                    type="button"
                    onClick={() => setOpenFolder(true)}
                    data-testid="sidebar-add-folder-btn"
                    variant="outline"
                    className="bg-transparent border-white/10 hover:bg-white/5 text-zinc-300 text-xs h-8 px-2.5"
                    title="Klasör Ekle"
                >
                    <FolderPlus className="w-3.5 h-3.5" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto py-2 px-1">
                {folders?.map((f) =>
                    renderFolderGroup(f, f.is_default),
                )}
                {/* Render unassigned only if any */}
                {clans.some((c) => !c.folder_id) &&
                    renderFolderGroup(null, false)}
            </div>

            <div className="border-t border-white/10 px-3 py-3 flex items-center justify-between">
                <div className="text-xs">
                    <div className="text-zinc-500 font-mono uppercase tracking-wider text-[10px]">
                        Operatör
                    </div>
                    <div className="text-zinc-200 font-medium">{user?.username || "—"}</div>
                </div>
                <button
                    type="button"
                    data-testid="logout-btn"
                    onClick={logout}
                    className="text-zinc-500 hover:text-rose-400 p-2 rounded hover:bg-white/5"
                    title="Çıkış"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>

            <AddClanDialog
                open={openClan}
                onOpenChange={setOpenClan}
                folders={folders}
                onCreated={onRefresh}
            />
            <AddFolderDialog
                open={openFolder}
                onOpenChange={setOpenFolder}
                onCreated={onRefresh}
            />
        </aside>
    );
}
