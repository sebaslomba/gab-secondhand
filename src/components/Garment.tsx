import type { Prenda } from "@/lib/data";

const SHAPES: Record<Prenda["g"], React.ReactNode> = {
  tee: <path d="M62 38 86 28q14 16 28 0l24 10 36 36-20 22-14-10v124H60V86L46 96 26 74Z" />,
  dress: <path d="M80 26h10q10 14 20 0h10l6 52-8 16 44 126H38L82 94l-8-16Z" />,
  jeans: (<><path d="M60 26h80l8 192h-38L100 96 90 218H52Z" /><path d="M60 40h80" stroke="rgba(0,0,0,.18)" strokeWidth="3" /></>),
  jacket: (<><path d="M62 32 86 24l14 34 14-34 24 8 30 34 6 136h-24l-4-96v114H56V106l-4 96H28l6-136Z" /><path d="M100 58v160" stroke="rgba(0,0,0,.2)" strokeWidth="3" /></>),
  skirt: (<><path d="M68 50h64l3 20 33 140H32L65 70Z" /><path d="M84 72 74 208M100 72v138M116 72l10 136" stroke="rgba(0,0,0,.12)" strokeWidth="3" /></>),
  sweater: (<><path d="M64 34 86 26q14 12 28 0l22 8 32 32 8 130h-24l-8-100v122H56V96l-8 100H24l8-130Z" /><path d="M56 206h88M24 186h24M152 186h24" stroke="rgba(0,0,0,.15)" strokeWidth="5" /></>),
};

// Ilustración provisoria hasta tener fotos reales de cada prenda.
export function Garment({ it }: { it: Prenda }) {
  return <svg viewBox="0 0 200 240" fill={it.col} aria-hidden="true">{SHAPES[it.g]}</svg>;
}
