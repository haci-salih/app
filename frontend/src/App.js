import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import DashboardLayout from "@/pages/DashboardLayout";
import Overview from "@/pages/Overview";
import ClanDetail from "@/pages/ClanDetail";
import History from "@/pages/History";

function App() {
    return (
        <div className="App">
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                            element={
                                <ProtectedRoute>
                                    <DashboardLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route path="/" element={<Overview />} />
                            <Route path="/clans/:id" element={<ClanDetail />} />
                            <Route path="/history" element={<History />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
                <Toaster position="top-right" theme="dark" />
            </AuthProvider>
        </div>
    );
}

export default App;
