"use client";

import templates from "./templates";

interface TemplateSelectorProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

const categoryLabels: Record<string, string> = {
  General: "📖 General",
  Business: "💼 Business",
  Fiction: "📚 Fiction",
  Technical: "💻 Technical",
  Design: "◇ Design",
  Academic: "🎓 Academic",
  Premium: "✦ Premium",
};

export default function TemplateSelector({ selectedId, onSelect }: TemplateSelectorProps) {
  const categories = [...new Set(templates.map((t) => t.category))];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Templates</h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>Choose a layout for your ebook</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {categories.map((cat) => (
          <div key={cat}>
            <h4 className="text-xs font-medium mb-2 px-1" style={{ color: "var(--text-muted)" }}>
              {categoryLabels[cat] || cat}
            </h4>
            <div className="space-y-2">
              {templates
                .filter((t) => t.category === cat)
                .map((tmpl) => {
                  const active = tmpl.id === selectedId;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => onSelect(tmpl.id)}
                      className="w-full text-left rounded-xl p-3 transition-all"
                      style={{
                        background: active ? "var(--accent-bg)" : "var(--bg-hover)",
                        border: active ? `1.5px solid var(--accent)` : "1px solid transparent",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg shrink-0">{tmpl.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate" style={{ color: active ? "var(--accent)" : "var(--text-primary)" }}>
                              {tmpl.name}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-tertiary)" }}>
                            {tmpl.description}
                          </p>
                        </div>
                        <div className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                          {tmpl.pageWidth} × {tmpl.pageHeight}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
