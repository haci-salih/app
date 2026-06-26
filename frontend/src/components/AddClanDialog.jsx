import { useState, useEffect } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AddClanDialog({ open, onOpenChange, folders, onCreated }) {
    const [tag, setTag] = useState("");
    const [folderId, setFolderId] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setTag("");
            const def = folders?.find((f) => f.is_default);
            setFolderId(def?.id || (folders?.[0]?.id ?? ""));
        }
    }, [open, folders]);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await api.post("/clans", {
                tag: tag.trim(),
                folder_id: folderId || null,
            });
            toast.success("Klan eklendi");
            onOpenChange(false);
            onCreated?.();
        } catch (e2) {
            const msg = e2?.response?.data?.detail;
            toast.error(typeof msg === "string" ? msg : "Klan eklenemedi");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#141414] border-white/10 text-zinc-200 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-white">Klan Ekle</DialogTitle>
                    <DialogDescription className="text-zinc-400 text-sm">
                        Takip etmek istediğiniz klanın etiketini ve klasörünü girin.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-mono">
                            Klan Etiketi
                        </Label>
                        <Input
                            data-testid="add-clan-tag-input"
                            placeholder="#ABCDEFG"
                            value={tag}
                            onChange={(e) => setTag(e.target.value)}
                            className="bg-black/60 border-white/10 text-white font-mono"
                            required
                        />
                        <p className="text-[11px] text-zinc-500">
                            Örnek: #2PP, #LR0CV8YV. Baştaki # opsiyoneldir.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-mono">
                            Klasör
                        </Label>
                        <Select
                            value={folderId}
                            onValueChange={setFolderId}
                        >
                            <SelectTrigger
                                data-testid="add-clan-folder-select"
                                className="bg-black/60 border-white/10 text-white"
                            >
                                <SelectValue placeholder="Klasör seçin" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#141414] border-white/10 text-zinc-200">
                                {folders?.map((f) => (
                                    <SelectItem
                                        key={f.id}
                                        value={f.id}
                                        data-testid={`add-clan-folder-option-${f.id}`}
                                    >
                                        {f.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                            disabled={busy || !tag.trim()}
                            data-testid="add-clan-submit"
                            className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            {busy ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                "Ekle"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
