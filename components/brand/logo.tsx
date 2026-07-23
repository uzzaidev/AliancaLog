// Wordmark Aliança Log — recriado em SVG a partir do logo oficial.
// Mark = "A" triangular bicolor (perna esquerda escura + perna/fita laranja).
// `variant`: "dark" (sobre fundo claro) usa preto no mark e no texto;
//            "light" (sobre topbar/hero escuros) usa branco no mark e no texto.
// O laranja da marca é constante nas duas variantes.
export function Logo({
  className = "",
  variant = "dark",
  size = 26,
}: {
  className?: string;
  variant?: "dark" | "light";
  size?: number;
}) {
  const solid = variant === "light" ? "#ffffff" : "#1e1e1e";
  const orange = "#f37312";

  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      style={{ color: solid }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 34 32"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        {/* perna esquerda (escura) */}
        <polygon points="15,3 19,3 10,29 5,29" fill={solid} />
        {/* perna direita / fita (laranja) */}
        <polygon points="16,3 20,3 29,29 24,29" fill={orange} />
        {/* travessa do A (laranja) */}
        <polygon points="12,20 26,20 24,25 14,25" fill={orange} opacity="0.92" />
      </svg>
      <span
        className="text-[1.05em] font-bold leading-none tracking-tight"
        style={{ color: solid }}
      >
        Aliança
        <span style={{ color: orange, fontStyle: "italic" }}> Log</span>
      </span>
    </span>
  );
}
