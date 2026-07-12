export type ViewMode = "code" | "reader" | "split";

interface Props {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ModeToggle({ mode, onChange }: Props) {
  const modes: { value: ViewMode; label: string; icon: string }[] = [
    { value: "code", label: "编辑", icon: "✍️" },
    { value: "split", label: "双栏", icon: "📖" },
    { value: "reader", label: "预览", icon: "👁️" }, 
  ];

  return (
    <div className="mode-toggle">
      {modes.map((m) => {
        const isActive = mode === m.value;
        return (
          <button
            key={m.value}
            className={`mode-btn ${isActive ? "active" : ""}`}
            onClick={() => onChange(m.value)}
            title={`${m.label}模式`}
          >
            <span>{m.icon}</span>
            <span className="btn-text">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}