"use client";

import { useState } from "react";
import type { EbookProject, EbookMetadata, EbookBranding } from "@/lib/ebook-storage";

interface MetadataEditorProps {
  project: EbookProject;
  onUpdate: (updates: Partial<EbookProject>) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>{title}</h4>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  return (
    <div>
      <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-tertiary)" }}>{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full text-xs rounded-lg px-2.5 py-1.5 outline-none resize-none h-16"
          style={{ background: "var(--bg-hover)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
        />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full text-xs rounded-lg px-2.5 py-1.5 outline-none"
          style={{ background: "var(--bg-hover)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
        />
      )}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <button onClick={() => onChange(!value)} className="h-4 w-7 rounded-full transition-all relative" style={{ background: value ? "var(--accent)" : "var(--bg-hover)", border: "1px solid var(--border-subtle)" }}>
        <div className={`h-3 w-3 rounded-full bg-white transition-all absolute top-0.5 ${value ? "left-3.5" : "left-0.5"}`} />
      </button>
    </div>
  );
}

export default function MetadataEditor({ project, onUpdate }: MetadataEditorProps) {
  const meta = project.metadata;
  const brand = project.branding;

  const updateMeta = (path: string, value: any) => {
    const parts = path.split(".");
    const updated = { ...meta } as any;
    let obj = updated;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
    onUpdate({ metadata: updated });
  };

  const updateBrand = (path: string, value: any) => {
    const parts = path.split(".");
    const updated = { ...brand } as any;
    let obj = updated;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
    onUpdate({ branding: updated });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Metadata</h3>
        <p className="text-xs mt-px" style={{ color: "var(--text-tertiary)" }}>Book info, branding & print settings</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">

        <Section title="Book Info">
          <Field label="ISBN" value={meta.isbn} onChange={(v) => updateMeta("isbn", v)} placeholder="978-3-16-148410-0" />
          <Field label="DOI" value={meta.doi} onChange={(v) => updateMeta("doi", v)} placeholder="10.1000/xyz123" />
          <Field label="Publisher" value={meta.publisher} onChange={(v) => updateMeta("publisher", v)} placeholder="Publisher Name" />
          <Field label="Language" value={meta.language} onChange={(v) => updateMeta("language", v)} placeholder="en" />
          <Field label="Edition" value={meta.edition} onChange={(v) => updateMeta("edition", v)} placeholder="First Edition" />
          <Field label="Series" value={meta.series} onChange={(v) => updateMeta("series", v)} placeholder="Series Name" />
          <Field label="Keywords (comma-separated)" value={meta.keywords.join(", ")} onChange={(v) => updateMeta("keywords", v.split(",").map((s: string) => s.trim()).filter(Boolean))} placeholder="keyword1, keyword2" multiline />
          <Field label="Categories (comma-separated)" value={meta.categories.join(", ")} onChange={(v) => updateMeta("categories", v.split(",").map((s: string) => s.trim()).filter(Boolean))} placeholder="cat1, cat2" multiline />
        </Section>

        <Section title="Branding">
          <Field label="Publisher Logo URL" value={brand.logo} onChange={(v) => updateBrand("logo", v)} placeholder="https://example.com/logo.png" />
          <Field label="Watermark Text" value={brand.watermark} onChange={(v) => updateBrand("watermark", v)} placeholder="DRAFT" />
          <Field label="Brand Colors (comma-separated hex)" value={brand.brandColors.join(", ")} onChange={(v) => updateBrand("brandColors", v.split(",").map((s: string) => s.trim()).filter(Boolean))} placeholder="#ff0000, #00ff00" />
          <Field label="Brand Fonts" value={brand.brandFonts} onChange={(v) => updateBrand("brandFonts", v)} placeholder="Font Family Name" />
        </Section>

        <Section title="Print Readiness">
          <Toggle label="CMYK Mode" value={meta.printReady.cmyk} onChange={(v) => updateMeta("printReady.cmyk", v)} />
          <Toggle label="Crop Marks" value={meta.printReady.cropMarks} onChange={(v) => updateMeta("printReady.cropMarks", v)} />
          <Toggle label="Printer Marks" value={meta.printReady.printerMarks} onChange={(v) => updateMeta("printReady.printerMarks", v)} />
          <Field label="Bleed" value={meta.printReady.bleed} onChange={(v) => updateMeta("printReady.bleed", v)} placeholder="0.125in" />
          <Field label="Gutter" value={meta.printReady.gutter} onChange={(v) => updateMeta("printReady.gutter", v)} placeholder="0in" />
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-tertiary)" }}>Binding</label>
            <div className="flex gap-1">
              {(["perfect", "saddle-stitch", "case", "spiral", "unknown"] as const).map((b) => (
                <button key={b} onClick={() => updateMeta("printReady.binding", b)}
                  className="flex-1 py-1 text-[9px] font-medium rounded-lg capitalize transition-all"
                  style={{
                    background: meta.printReady.binding === b ? "var(--accent)" : "var(--bg-hover)",
                    color: meta.printReady.binding === b ? "#fff" : "var(--text-secondary)",
                    border: meta.printReady.binding === b ? "none" : "1px solid var(--border-subtle)",
                  }}
                >{b.replace("-", "\n")}</button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Accessibility">
          <Toggle label="Screen Reader Optimized" value={meta.accessibility.screenReader} onChange={(v) => updateMeta("accessibility.screenReader", v)} />
          <Toggle label="Alt Text Required" value={meta.accessibility.altText} onChange={(v) => updateMeta("accessibility.altText", v)} />
          <Toggle label="Color Contrast Check" value={meta.accessibility.contrast} onChange={(v) => updateMeta("accessibility.contrast", v)} />
          <Toggle label="Keyboard Navigation" value={meta.accessibility.keyboardNav} onChange={(v) => updateMeta("accessibility.keyboardNav", v)} />
          <Toggle label="Accessible PDF" value={meta.accessibility.accessiblePdf} onChange={(v) => updateMeta("accessibility.accessiblePdf", v)} />
          <Field label="WCAG Standard" value={meta.accessibility.wcag} onChange={(v) => updateMeta("accessibility.wcag", v)} placeholder="WCAG 2.1 AA" />
        </Section>

      </div>
    </div>
  );
}
