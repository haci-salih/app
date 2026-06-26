import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // null=loading, false=unauth, {} = authed
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("cw_token");
        if (!token) {
            setUser(false);
            setLoading(false);
            return;
        }
        api.get("/auth/me")
            .then((r) => setUser(r.data))
            .catch(() => setUser(false))
            .finally(() => setLoading(false));
    }, []);

    const login = async (username, password) => {
        const { data } = await api.post("/auth/login", { username, password });
        localStorage.setItem("cw_token", data.token);
        setUser({ username: data.username });
        return data;
    };

    const logout = () => {
        localStorage.removeItem("cw_token");
        setUser(false);
        window.location.href = "/login";
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
