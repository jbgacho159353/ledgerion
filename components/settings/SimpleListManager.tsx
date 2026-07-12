"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Item {
  id: string;
  name: string;
}

interface Props {
  title: string;
  description: string;
  items: Item[];
  onCreate: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  placeholder: string;
  icon?: string;
}

export default function SimpleListManager({
  title,
  description,
  items,
  onCreate,
  onDelete,
  placeholder,
  icon,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    if (items.some((i) => i.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" already exists.`);
      return;
    }

    startTransition(async () => {
      try {
        await onCreate(trimmed);
        setName("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add.");
      }
    });
  }

  function handleDelete(id: string) {
    setDeleteError(null);
    startTransition(async () => {
      try {
        await onDelete(id);
        router.refresh();
      } catch (err) {
        setDeleteError({ id, message: err instanceof Error ? err.message : "Failed to delete." });
      }
    });
  }

  return (
    <div className="glass-card h-full animate-fade-up space-y-4 p-6">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-soft text-base">
            {icon}
          </div>
        )}
        <div>
          <h2 className="font-sans text-sm font-semibold text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">None yet — add one below.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <div className="flex items-center justify-between rounded-lg border border-border bg-white/[0.02] px-3 py-1.5 transition-colors hover:bg-white/[0.04]">
                <span className="text-sm text-slate-200">{item.name}</span>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={isPending}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:text-loss disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Delete ${item.name}`}
                >
                  ✕
                </button>
              </div>
              {deleteError?.id === item.id && <p className="mt-1 text-xs text-loss">{deleteError.message}</p>}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="input-field"
        />
        <button type="submit" disabled={isPending} className="btn-secondary shrink-0">
          Add
        </button>
      </form>
      {error && <p className="text-xs text-loss">{error}</p>}
    </div>
  );
}
