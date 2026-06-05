"use client";

import { useState } from "react";

type Item = { id: string; imageUrl: string; createdAt: string };

export default function GalleryGrid({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial);

  async function remove(id: string) {
    if (!confirm("Excluir esta arte?")) return;
    const res = await fetch(`/api/artworks/${id}`, { method: "DELETE" });
    if (res.ok) setItems((x) => x.filter((i) => i.id !== id));
  }

  function download(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = url.split("/").pop() ?? "arte.png";
    a.click();
  }

  if (items.length === 0) {
    return (
      <div className="card text-center text-gray-400">
        Nenhuma arte salva ainda. Gere uma no Estúdio e clique em “Salvar na galeria”.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((a) => (
        <div key={a.id} className="card p-3">
          <div className="aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.imageUrl} alt="arte" className="h-full w-full object-cover" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {new Date(a.createdAt).toLocaleDateString("pt-BR")}
            </span>
            <div className="flex gap-2">
              <button onClick={() => download(a.imageUrl)} className="text-xs text-sky-400 hover:underline">
                Baixar
              </button>
              <button onClick={() => remove(a.id)} className="text-xs text-gray-500 hover:text-red-300">
                Excluir
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
