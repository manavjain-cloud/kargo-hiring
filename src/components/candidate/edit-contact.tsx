"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ROLES, type RoleCode } from "@/lib/rubric";
import { apiError } from "@/lib/ui";

/** Manual corrections when extraction got the name/email wrong, or the role was mis-assigned. */
export function EditContact({ id, name, email, role }: { id: string; name: string; email: string | null; role: RoleCode }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(name);
  const [e, setE] = useState(email ?? "");
  const [r, setR] = useState<RoleCode>(role);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: n.trim(), email: e.trim(), roleCode: r }),
    });
    setBusy(false);
    if (!res.ok) return toast(await apiError(res), "error");
    toast("Candidate details updated.", "success");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-fg">
        <Pencil className="size-3" /> Edit details
      </button>
      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Edit candidate details"
        description="For display and communication only. None of these affect the score."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} loading={busy} disabled={!n.trim()}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-[13px]">
          <label className="block">
            <span className="font-medium">Name</span>
            <input value={n} onChange={(ev) => setN(ev.target.value)} className="mt-1 h-9 w-full rounded-md border border-line bg-surface-2 px-2.5" />
          </label>
          <label className="block">
            <span className="font-medium">Email</span>
            <input value={e} onChange={(ev) => setE(ev.target.value)} type="email" className="mt-1 h-9 w-full rounded-md border border-line bg-surface-2 px-2.5" />
          </label>
          <label className="block">
            <span className="font-medium">Role applied for</span>
            <select value={r} onChange={(ev) => setR(ev.target.value as RoleCode)} className="mt-1 h-9 w-full rounded-md border border-line bg-surface-2 px-2">
              {(Object.keys(ROLES) as RoleCode[]).map((k) => (
                <option key={k} value={k}>
                  {ROLES[k].title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Dialog>
    </>
  );
}
