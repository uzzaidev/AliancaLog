// Wordmark simples do Aliança Log. Mark = dois "elos" entrelaçados (aliança).
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="9" cy="12" r="5.5" stroke="currentColor" strokeWidth="2.5" />
        <circle
          cx="15"
          cy="12"
          r="5.5"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity="0.5"
        />
      </svg>
      <span className="font-semibold tracking-tight">
        Aliança<span className="text-brand"> Log</span>
      </span>
    </span>
  );
}
