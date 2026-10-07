import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Mail, Phone, Briefcase, Link as LinkIcon, Trash2 } from "lucide-react";
import { api, User } from "../lib/api";
import { usePrefs } from "../lib/prefs";
import { errText } from "../lib/errors";
import Avatar from "../components/Avatar";

async function toAvatar(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const m = Math.min(img.width, img.height); c.getContext("2d")!.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 256, 256);
    return c.toDataURL("image/jpeg", 0.85);
  } finally { URL.revokeObjectURL(url); }
}

export default function Account() {
  const { t } = usePrefs();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<User>("/me") });
  const file = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [photoErr, setPhotoErr] = useState("");
  const [f, setF] = useState({ name: "", phone: "", position: "", bio: "", social: "" });

  useEffect(() => { if (me.data) setF({ name: me.data.name, phone: me.data.phone, position: me.data.position, bio: me.data.bio, social: me.data.social }); }, [me.data]);
  const save = useMutation({
    mutationFn: () => api<User>("/me", { method: "PUT", body: JSON.stringify({ ...f, avatar }) }),
    onSuccess: () => { setAvatar(null); qc.invalidateQueries({ queryKey: ["me"] }); },
  });
  const pick = async (file0?: File) => {
    setPhotoErr(""); if (!file0) return;
    if (!file0.type.startsWith("image/")) return setPhotoErr(t("photoInvalid"));
    if (file0.size > 5 * 1024 * 1024) return setPhotoErr(t("photoTooBig"));
    try { setAvatar(await toAvatar(file0)); } catch { setPhotoErr(t("photoInvalid")); }
  };

  const label = "muted mb-1 flex items-center gap-1 text-xs";
  const shownAvatar = avatar !== null ? avatar : me.data?.avatar;
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t("profile")}</h1>
        <p className="muted mt-1 text-sm">{t("contactHint")}</p>
      </div>
      <form className="card space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="flex items-center gap-4">
          <Avatar name={f.name} src={shownAvatar} size={82} />
          <div>
            <p className="font-semibold">{f.name || me.data?.email}</p>
            <p className="muted text-sm">{me.data?.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={() => file.current?.click()}><Camera size={15} />{t("changePhoto")}</button>
              {shownAvatar && <button type="button" className="btn text-red-500" onClick={() => setAvatar("")}><Trash2 size={15} />{t("removePhoto")}</button>}
            </div>
            {photoErr && <p className="mt-1 text-xs text-red-500">{photoErr}</p>}
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
        </div>
        <label className="block"><span className={label}>{t("name")}</span><input className="input" required maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="block"><span className={label}><Mail size={12} />{t("emailLogin")}</span><input className="input opacity-60" disabled value={me.data?.email ?? ""} /></label>
        <label className="block"><span className={label}><Briefcase size={12} />{t("position")}</span><input className="input" maxLength={100} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} /></label>
        <label className="block"><span className={label}><Phone size={12} />{t("phone")}</span><input className="input" type="tel" maxLength={20} placeholder="081-234-5678" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        <label className="block"><span className={label}><LinkIcon size={12} />{t("social")}</span><input className="input" maxLength={300} placeholder="https://..." value={f.social} onChange={(e) => setF({ ...f, social: e.target.value })} /></label>
        <label className="block"><span className={label}>{t("bio")}</span><textarea className="input" rows={3} maxLength={300} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /><span className="muted block text-right text-xs">{f.bio.length}/300</span></label>
        {save.isError && <p className="text-sm text-red-500">{errText(save.error, t)}</p>}
        {save.isSuccess && <p className="text-sm text-emerald-600">{t("saved")}</p>}
        <button className="btn btn-primary" disabled={save.isPending}>{t("save")}</button>
      </form>
    </div>
  );
}
