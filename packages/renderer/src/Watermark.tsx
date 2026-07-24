/** Fixed bottom-right, 40% opacity — spec Section 5 shared rule. */
export function Watermark({ label = "APEX Preview" }: { label?: string }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "1rem",
        right: "1rem",
        opacity: 0.4,
        pointerEvents: "none",
        zIndex: 50,
        fontSize: "0.75rem",
        fontFamily: "var(--brand-font-body)",
        color: "var(--brand-color-primary)",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
  );
}
