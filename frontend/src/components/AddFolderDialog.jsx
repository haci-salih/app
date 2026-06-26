import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AddFolderDialog({ open, onOpenChange, onCreated }) {
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) setName("");
    }, [open]);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await api.post("/folders", { name: name.trim() });
            toast.success("Klasör eklendi");
            onOpenChange(false);
            onCreated?.();
        } catch (e2) {
            const msg = e2?.response?.data?.detail;
            toast.error(typeof msg === "string" ? msg : "Eklenemedi");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#141414] border-white/10 text-zinc-200 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-white">Klasör Ekle</DialogTitle>
                    <DialogDescription className="text-zinc-400 text-sm">
                        Klanlarınızı organize etmek için yeni bir klasör oluşturun.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-mono">
                            Klasör Adı
                        </Label>
                        <Input
                            data-testid="add-folder-name-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Örn: Aktif Klanlar"
                            className="bg-black/60 border-white/10 text-white"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="bg-transparent border-white/10 text-zinc-300 hover:bg-white/5"
                        >
                            İptal
                        </Button>
                        <Button
                            type="submit"
                            disabled={busy || !name.trim()}
                            data-testid="add-folder-submit"
                            className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            {busy ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                "Oluştur"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
