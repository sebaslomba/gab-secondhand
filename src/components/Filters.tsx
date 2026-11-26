"use client";
import { useEffect, useId, useRef, useState } from "react";

type Group = { key: string; label: string; value: string; active: boolean; options: string[]; selected: string | null; onPick: (v: string) => void; onClear?: () => void };

const Chevron = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
);

/** Dos botones iguales ("Tipo de ropa" y "Talle") que despliegan una grilla pareja de opciones. Uno abierto a la vez. */
export function Filters({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="filters" ref={root}>
      <div className="filter-toggles">
        {groups.map(g => (
          <button key={g.key} type="button" className="filter-toggle" data-active={g.active} aria-expanded={open === g.key}
            aria-controls={`${id}-${g.key}`} onClick={() => setOpen(o => (o === g.key ? null : g.key))}>
            <span className="ft-text"><small>{g.label}</small><b>{g.value}</b></span>
            <Chevron />
          </button>
        ))}
      </div>
      {groups.map(g => (
        <div key={g.key} id={`${id}-${g.key}`} className="filter-panel" data-open={open === g.key} inert={open !== g.key}>
          <div className="fp-inner">
            <div className="fp-grid" role="group" aria-label={g.label}>
              {g.options.map(o => (
                <button key={o} type="button" aria-pressed={g.selected === o} onClick={() => { g.onPick(o); setOpen(null); }}>{o}</button>
              ))}
            </div>
            {g.onClear && g.active && (
              <button type="button" className="fp-clear" onClick={() => { g.onClear?.(); setOpen(null); }}>Ver todos los talles</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
