// The look of the product: zkPass Enterprise Broadsheet System.
// Carbon canvas (#060606), Onyx cards (#1f1f1f) with 1px Graphite borders (#252525),
// Signal Lime (#c5ff4a) functional triggers and sharp 4px architectural radii.
export const ui = {
  label: "block text-[11px] font-sans font-medium uppercase tracking-[0.22em] text-[#7a7a7a] mb-1.5",
  input:
    "w-full bg-[#000000] border border-[#252525] rounded-[4px] px-3.5 py-2 text-sm font-mono text-[#ffffff] placeholder:text-[#7a7a7a] outline-none transition-colors duration-150 focus:bg-[#161616] focus:border-[#c5ff4a] focus:ring-1 focus:ring-[#c5ff4a]",
  error: "text-rose-400 text-xs mt-1 font-mono",
  button:
    "px-5 py-2.5 bg-[#c5ff4a] hover:opacity-95 text-[#000000] font-sans font-medium text-xs uppercase tracking-[0.04em] rounded-[4px] shadow-[0_0_8px_rgba(197,255,74,0.45)] active:scale-95 transition-all flex items-center justify-center gap-2 select-none cursor-pointer",
  ghost:
    "px-4 py-2 bg-transparent hover:bg-[#252525] text-[#ffffff] hover:text-[#c5ff4a] border border-[#252525] hover:border-[#313131] rounded-[4px] text-xs font-sans font-medium uppercase tracking-[0.08em] transition-colors select-none cursor-pointer",
  danger:
    "px-4 py-2 bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 border border-rose-900/50 hover:border-rose-500 rounded-[4px] text-xs font-sans font-medium uppercase tracking-[0.08em] transition-colors select-none cursor-pointer",
  card: "bg-[#1f1f1f] rounded-[4px] p-6 border border-[#252525] transition-colors hover:border-[#313131]",
  link: "text-[#c5ff4a] hover:underline font-mono text-xs transition-colors",
  muted: "text-[#7a7a7a] text-xs font-sans",
} as const;
