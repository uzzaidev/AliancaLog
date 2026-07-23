// Barra de progresso laranja com label "X de Y · %". Server-safe.
// `dark` inverte as cores para uso sobre fundo escuro (hero do cliente).
export function Progress({
  done,
  total,
  label,
  dark = false,
}: {
  done: number;
  total: number;
  label?: string;
  dark?: boolean;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div
        className={`h-1.5 w-full overflow-hidden rounded-full ${
          dark ? "bg-dark-3" : "bg-gray-200"
        }`}
      >
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        className={`mt-1.5 flex justify-between text-xs ${
          dark ? "text-gray-500" : "text-muted"
        }`}
      >
        <span>{label ?? `${done} de ${total}`}</span>
        <span className="font-semibold text-brand">{pct}%</span>
      </div>
    </div>
  );
}
