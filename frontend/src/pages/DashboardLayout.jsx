import { useCallback, useEffect, useState } from "react";
import { Outlet, useOutletContext } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import api from "@/lib/api";

export default function DashboardLayout() {
    const [folders, setFolders] = useState([]);
    const [clans, setClans] = useState([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        const [f, c] = await Promise.all([
            api.get("/folders"),
            api.get("/clans"),
        ]);
        setFolders(f.data || []);
        setClans(c.data || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        refresh();
        const t = setInterval(refresh, 60000);
        return () => clearInterval(t);
    }, [refresh]);

    return (
        <div className="min-h-screen flex bg-[#0A0A0A]">
            <Sidebar
                folders={folders}
                clans={clans}
                onRefresh={refresh}
            />
            <main className="flex-1 min-h-screen">
                <Outlet context={{ folders, clans, refresh, loading }} />
            </main>
        </div>
    );
}

export function useDashboard() {
    return useOutletContext();
}
