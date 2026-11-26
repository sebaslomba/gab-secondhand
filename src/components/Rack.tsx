"use client";
import { gs } from "@/lib/data";
import { Garment } from "./Garment";
import { useStore } from "./Store";

const Hook = () => (
  <svg className="hk" viewBox="0 0 120 64" aria-hidden="true">
    <path d="M60 30V22c0-4 7-5 7-12a7 7 0 0 0-14 0" /><path d="M60 30 10 56q-5 4 2 4h96q7 0 2-4Z" />
  </svg>
);

const startSwing = (e: React.SyntheticEvent<HTMLElement>) => { e.currentTarget.dataset.swing = ""; };
// No se corta la animación: solo marca que, al terminar la vuelta actual, debe frenar.
const stopSwing = (e: React.SyntheticEvent<HTMLElement>) => {
  const el = e.currentTarget;
  if (!el.getAnimations().some(a => a.playState === "running")) delete el.dataset.swing;
};

export function Rack() {
  const { items, open } = useStore();
  const picks = items.filter(i => i.st === "av").slice(0, 6);
  return (
    <section className="rackband" aria-label="Destacadas">
      <div className="rod" aria-hidden="true" />
      <div className="hangers">
        {picks.map((it, k) => (
          <button key={it.id} className="hanger" style={{ ["--i" as string]: k }} onClick={() => open(it.id)}
            onAnimationEnd={e => { if (e.animationName.includes("hang-in")) e.currentTarget.dataset.ready = ""; }}
            onMouseEnter={startSwing} onFocus={startSwing}
            onMouseLeave={stopSwing} onBlur={stopSwing}
            onAnimationIteration={e => { const el = e.currentTarget; if (!el.matches(":hover, :focus-visible")) delete el.dataset.swing; }}
            aria-label={`${it.t}, talle ${it.s}, ${gs(it.p)} guaraníes`}>
            <Hook />
            <div className="glass">
              <div className="ph" style={{ ["--tint" as string]: it.bg }}><Garment it={it} /></div>
              <div className="meta"><b>{gs(it.p)}</b><small>Talle {it.s}</small></div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
