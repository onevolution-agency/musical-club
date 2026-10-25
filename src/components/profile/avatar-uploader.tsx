"use client";

import { useState } from "react";
import { Avatar } from "@/components/brand/avatar";
import { createBrowserClientConfigured } from "@/lib/supabase/browser";
import { saveAvatarUrl } from "@/modules/auth/actions";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

async function compress(file: File): Promise<Blob> {
  if (!TYPES.includes(file.type)) throw new Error("Usá JPG, PNG o WebP.");
  if (file.size > MAX_BYTES) throw new Error("La foto pesa más de 2 MB.");
  const bitmap = await createImageBitmap(file);
  const max = 512;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No pudimos subir la foto.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("No pudimos subir la foto.");
  return blob;
}

export function AvatarUploader({ userId, name, url }: { userId: string; name: string; url: string | null }) {
  const [preview, setPreview] = useState(url);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const blob = await compress(file);
      const supabase = createBrowserClientConfigured();
      if (!supabase) throw new Error("No pudimos subir la foto.");
      const path = `${userId}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, {
        upsert: true,
        contentType: "image/jpeg",
        cacheControl: "3600",
      });
      if (uploadError) throw new Error("No pudimos subir la foto.");
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
      const saved = await saveAvatarUrl(publicUrl);
      if (!saved.ok) throw new Error(saved.error);
      setPreview(publicUrl);
      setMessage(saved.message ?? "Foto actualizada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos subir la foto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row">
      <Avatar name={name} url={preview} size={72} />
      <label className="field" style={{ margin: 0, flex: 1 }}>
        <span>Foto de perfil</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange} disabled={busy} />
        {busy ? <span className="hint">Subiendo…</span> : null}
      </label>
      {message ? <p className="form-ok">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
