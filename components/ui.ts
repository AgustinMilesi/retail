// The look of the product: zkPass Enterprise Broadsheet System.
// Carbon canvas (#060606), Onyx cards (#1f1f1f) with 1px Graphite borders (#252525),
// Signal Lime (#c5ff4a) functional triggers and ergonomic 6px architectural radii.
export const ui = {
  label: "block text-xs font-sans font-medium text-[#a3a3a3] mb-1.5",
  input:
    "min-h-[44px] w-full bg-[#000000] border border-[#262626] rounded-[6px] px-3.5 py-2.5 text-sm font-mono text-[#ffffff] placeholder:text-[#666666] outline-none transition-colors duration-150 focus:bg-[#111111] focus:border-[#c5ff4a] focus:ring-1 focus:ring-[#c5ff4a]",
  error: "text-rose-400 text-xs mt-1 font-mono flex items-center gap-1",
  button:
    "min-h-[44px] px-5 py-2.5 bg-[#c5ff4a] hover:bg-[#b8f73b] active:bg-[#a6e625] text-[#000000] font-sans font-semibold text-xs tracking-wider uppercase rounded-[6px] shadow-[0_0_12px_rgba(197,255,74,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5ff4a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#060606]",
  ghost:
    "min-h-[44px] px-4 py-2.5 bg-[#161616] hover:bg-[#222222] text-[#e5e5e5] hover:text-[#c5ff4a] border border-[#262626] hover:border-[#383838] rounded-[6px] text-xs font-sans font-medium tracking-wide active:scale-[0.98] transition-all flex items-center justify-center gap-2 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5ff4a]",
  danger:
    "min-h-[44px] px-4 py-2.5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-300 border border-rose-900/40 hover:border-rose-600 rounded-[6px] text-xs font-sans font-medium tracking-wide active:scale-[0.98] transition-all flex items-center justify-center gap-2 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500",
  card: "bg-[#1f1f1f] rounded-[6px] p-5 sm:p-6 border border-[#252525] transition-colors hover:border-[#313131]",
  link: "text-[#c5ff4a] hover:underline font-mono text-xs transition-colors cursor-pointer",
  muted: "text-[#a3a3a3] text-xs font-sans",
} as const;
