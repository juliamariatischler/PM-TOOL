"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function CreateSpaceDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#00B050");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSaving(true);
    try {
      const response = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, color }),
      });

      if (!response.ok) {
        return;
      }

      setName("");
      setColor("#00B050");
      await onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Space erstellen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="z. B. Vertrieb"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Farbe</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-10 w-14 cursor-pointer rounded-md border border-gray-200 bg-white p-1"
              />
              <input
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase tracking-wide text-gray-600 focus:border-[#00B050] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              disabled={saving}
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreate}
              className="rounded-lg bg-[#00B050] px-4 py-2 text-sm font-medium text-white hover:bg-[#00963f] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving || !name.trim()}
            >
              {saving ? "Speichert..." : "Space erstellen"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
