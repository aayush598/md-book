"use client";

import { useState } from "react";
import type { EbookProject } from "@/lib/ebook-storage";
import { defaultTheme, type EbookTheme, FONT_OPTIONS, pageSizes, themeToCss, getFontStack } from "@/lib/ebook-theme";

interface ThemeEditorProps {
  project: EbookProject;
  onThemeChange: (theme: EbookTheme) => void;
}

const COLOR_PRESETS = {
  bodyColor: ["#2c2416", "#1e1e24", "#26221c", "#333336", "#1a1a2e", "#000000"],
  bgColor: ["#fefcf7", "#ffffff", "#fdfbf9", "#fafaf9", "#fefcf8", "#f5f0eb"],
  accentColor: ["#8b4513", "#2563eb", "#b8860b", "#6366f1", "#dc2626", "#059669"],
  headingColor: ["#1a1208", "#0a0a0f", "#1a1510", "#000000", "#111827", "#1e1b4b"],
};

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-1 py-2 text-xs font-semibold uppercase tracking-wider transition-all" style={{ color: "var(--text-muted)" }}>
        {title}
        <svg className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && <div className="pb-3 space-y-2">{children}</div>}
    </div>
  );
}

function Label({ children, preview }: { children: React.ReactNode; preview?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-0.5">
      <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>{children}</span>
      {preview}
    </div>
  );
}

function ColorRow({ label, value, onChange, presetKey }: { label: string; value: string; onChange: (v: string) => void; presetKey?: keyof typeof COLOR_PRESETS }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-1.5">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-8 rounded cursor-pointer shrink-0" style={{ background: "var(--bg-hover)", border: "1px solid var(--border-subtle)" }} />
        <div className="flex-1 flex gap-0.5">
          {presetKey && COLOR_PRESETS[presetKey].map((c) => (
            <button key={c} onClick={() => onChange(c)} className={`h-4 w-4 rounded-full transition-all ${c === value ? "ring-2 ring-offset-1" : ""}`}
              style={{ background: c, boxShadow: c === value ? `0 0 0 2px var(--accent), 0 0 0 3px ${c}` : "none" }}
            />
          ))}
        </div>
        <span className="text-[9px] font-mono w-14 text-right truncate" style={{ color: "var(--text-tertiary)" }}>{value}</span>
      </div>
    </div>
  );
}

function SelectRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { id: string; name: string }[] }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-0.5">
          {options.map((o) => (
            <button key={o.id} onClick={() => onChange(o.id)}
              className="flex-1 py-1 text-[10px] font-medium rounded-lg transition-all truncate"
              style={{
                background: o.id === value ? "var(--accent)" : "var(--bg-hover)",
                color: o.id === value ? "#fff" : "var(--text-secondary)",
                border: o.id === value ? "none" : "1px solid var(--border-subtle)",
              }}
            >{o.name}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, value, onChange, min, max, step, suffix }: { label: string; value: string; onChange: (v: string) => void; min: number; max: number; step: number; suffix?: string }) {
  const num = parseFloat(value) || min;
  const handleChange = (newNum: number) => {
    const clamped = Math.min(max, Math.max(min, newNum));
    onChange(suffix ? `${clamped}${suffix}` : String(clamped));
  };
  const pct = ((num - min) / (max - min)) * 100;

  return (
    <div>
      <Label preview={<span className="text-[9px] font-mono tabular-nums" style={{ color: "var(--text-tertiary)" }}>{value}</span>}>{label}</Label>
      <div className="flex items-center gap-2">
        <input type="range" min={min} max={max} step={step} value={num} onChange={(e) => handleChange(parseFloat(e.target.value))}
          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--accent) 0% ${pct}%, var(--bg-hover) ${pct}% 100%)`,
            accentColor: "var(--accent)",
          }}
        />
        <input type="number" value={num} onChange={(e) => handleChange(parseFloat(e.target.value) || min)}
          className="w-12 text-[10px] rounded-lg px-1.5 py-1 outline-none text-center font-mono tabular-nums"
          style={{ background: "var(--bg-hover)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
          min={min} max={max} step={step}
        />
      </div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <button onClick={() => onChange(!value)} className="h-4 w-7 rounded-full transition-all relative" style={{ background: value ? "var(--accent)" : "var(--bg-hover)", border: "1px solid var(--border-subtle)" }}>
        <div className={`h-3 w-3 rounded-full bg-white transition-transform absolute top-0.5 ${value ? "left-3.5" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function FontPreview({ fontId }: { fontId: string }) {
  const stack = getFontStack(fontId);
  return (
    <span className="text-lg leading-none" style={{ fontFamily: stack, color: "var(--text-primary)" }}>Aa</span>
  );
}

export default function ThemeEditor({ project, onThemeChange }: ThemeEditorProps) {
  const theme = project.theme || defaultTheme();
  const set = (path: string, value: any) => {
    const parts = path.split(".");
    const updated = { ...theme };
    let obj: any = updated;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
    onThemeChange(updated);
  };

  const t = (path: string) => {
    const parts = path.split(".");
    let obj: any = theme;
    for (const p of parts) obj = obj?.[p];
    return obj ?? "";
  };

  const numVal = (path: string): number => {
    const v = t(path);
    return typeof v === "string" ? parseFloat(v.replace(/[^0-9.]/g, "")) || 1 : (typeof v === "number" ? v : 1);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Theme Controls</h3>
        <p className="text-[10px] mt-px" style={{ color: "var(--text-tertiary)" }}>Customize every aspect of your book</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">

        {/* Quick Font Preview */}
        <Section title="Typography">
          <div className="flex items-center gap-3 px-1 py-1.5 rounded-lg" style={{ background: "var(--bg-hover)" }}>
            <FontPreview fontId={t("typography.bodyFont")} />
            <div className="text-[9px] leading-tight" style={{ color: "var(--text-tertiary)" }}>
              <div>{FONT_OPTIONS.find((f) => f.id === t("typography.bodyFont"))?.name || "Body"}</div>
              <div>{FONT_OPTIONS.find((f) => f.id === t("typography.headingFont"))?.name || "Headings"}</div>
            </div>
          </div>
          <SelectRow label="Body Font" value={t("typography.bodyFont")} onChange={(v) => set("typography.bodyFont", v)} options={FONT_OPTIONS} />
          <SelectRow label="Heading Font" value={t("typography.headingFont")} onChange={(v) => set("typography.headingFont", v)} options={FONT_OPTIONS} />
          <SliderRow label="Body Size" value={t("typography.bodySize")} onChange={(v) => set("typography.bodySize", v)} min={0.7} max={1.6} step={0.05} suffix="rem" />
          <SliderRow label="Line Height" value={t("typography.bodyLineHeight")} onChange={(v) => set("typography.bodyLineHeight", v)} min={1.2} max={2.4} step={0.05} />
          <SliderRow label="Heading Weight" value={t("typography.headingWeight")} onChange={(v) => set("typography.headingWeight", v)} min={300} max={900} step={100} />
          <SliderRow label="Heading Line H" value={t("typography.headingLineHeight")} onChange={(v) => set("typography.headingLineHeight", v)} min={1.0} max={2.0} step={0.05} />
        </Section>

        {/* Colors */}
        <Section title="Colors">
          <ColorRow label="Body Text" value={t("colors.bodyColor")} onChange={(v) => set("colors.bodyColor", v)} presetKey="bodyColor" />
          <ColorRow label="Background" value={t("colors.bgColor")} onChange={(v) => set("colors.bgColor", v)} presetKey="bgColor" />
          <ColorRow label="Headings" value={t("colors.headingColor")} onChange={(v) => set("colors.headingColor", v)} presetKey="headingColor" />
          <ColorRow label="Accent" value={t("colors.accentColor")} onChange={(v) => set("colors.accentColor", v)} presetKey="accentColor" />
          <ColorRow label="Links" value={t("colors.linkColor")} onChange={(v) => set("colors.linkColor", v)} />
          <ColorRow label="Code BG" value={t("colors.codeBg")} onChange={(v) => set("colors.codeBg", v)} />
          <ColorRow label="Quote Border" value={t("colors.blockquoteBorder")} onChange={(v) => set("colors.blockquoteBorder", v)} />
          <ColorRow label="Table Header" value={t("colors.tableHeaderBg")} onChange={(v) => set("colors.tableHeaderBg", v)} />
        </Section>

        {/* Layout & Margins */}
        <Section title="Layout">
          <SelectRow label="Page Size" value={project.pageSize} onChange={(v) => onThemeChange(theme)} options={pageSizes().map((ps) => ({ id: ps.id, name: ps.label }))} />
          <SliderRow label="Margin Top" value={t("layout.marginTop")} onChange={(v) => set("layout.marginTop", v)} min={0.5} max={4} step={0.1} suffix="em" />
          <SliderRow label="Margin Bottom" value={t("layout.marginBottom")} onChange={(v) => set("layout.marginBottom", v)} min={0.5} max={4} step={0.1} suffix="em" />
          <SliderRow label="Margin Left" value={t("layout.marginLeft")} onChange={(v) => set("layout.marginLeft", v)} min={0.5} max={4} step={0.1} suffix="em" />
          <SliderRow label="Margin Right" value={t("layout.marginRight")} onChange={(v) => set("layout.marginRight", v)} min={0.5} max={4} step={0.1} suffix="em" />
          <SliderRow label="Paragraph Gap" value={t("layout.paragraphSpacing")} onChange={(v) => set("layout.paragraphSpacing", v)} min={0} max={2} step={0.1} suffix="em" />
          <SliderRow label="Section Gap" value={t("layout.sectionSpacing")} onChange={(v) => set("layout.sectionSpacing", v)} min={0.5} max={5} step={0.25} suffix="em" />
        </Section>

        {/* Headers & Chapter Pages */}
        <Section title="Headers">
          <SelectRow label="Style" value={t("headers.style")} onChange={(v) => set("headers.style", v)} options={[
            { id: "fancy", name: "Fancy" }, { id: "simple", name: "Simple" }, { id: "minimal", name: "Minimal" },
            { id: "ornate", name: "Ornate" }, { id: "modern", name: "Modern" },
          ]} />
          <ToggleRow label="Show Numbers" value={t("headers.showNumbers")} onChange={(v) => set("headers.showNumbers", v)} />
          <ToggleRow label="Underline" value={t("headers.underline")} onChange={(v) => set("headers.underline", v)} />
        </Section>

        <Section title="Chapter Pages">
          <SelectRow label="Layout" value={t("chapterPages.layout")} onChange={(v) => set("chapterPages.layout", v)} options={[
            { id: "standard", name: "Standard" }, { id: "centered", name: "Centered" },
            { id: "ornate", name: "Ornate" }, { id: "minimal", name: "Minimal" }, { id: "modern", name: "Modern" },
          ]} />
          <ToggleRow label="Show Number" value={t("chapterPages.showNumber")} onChange={(v) => set("chapterPages.showNumber", v)} />
          <ToggleRow label="Decorative Line" value={t("chapterPages.decorativeLine")} onChange={(v) => set("chapterPages.decorativeLine", v)} />
          <ToggleRow label="Drop Caps" value={t("chapterPages.dropCaps")} onChange={(v) => set("chapterPages.dropCaps", v)} />
        </Section>

        {/* TOC */}
        <Section title="Table of Contents">
          <SelectRow label="Style" value={t("toc.style")} onChange={(v) => set("toc.style", v)} options={[
            { id: "standard", name: "Standard" }, { id: "minimal", name: "Minimal" }, { id: "fancy", name: "Fancy" },
          ]} />
          <ToggleRow label="Page Numbers" value={t("toc.showPageNumbers")} onChange={(v) => set("toc.showPageNumbers", v)} />
          <ToggleRow label="Dotted Leaders" value={t("toc.showDots")} onChange={(v) => set("toc.showDots", v)} />
        </Section>

        {/* Images & Tables & Callouts */}
        <Section title="Images">
          <SelectRow label="Style" value={t("images.style")} onChange={(v) => set("images.style", v)} options={[
            { id: "shadow", name: "Shadow" }, { id: "border", name: "Border" },
            { id: "rounded", name: "Rounded" }, { id: "flat", name: "Flat" },
          ]} />
          <SliderRow label="Max Width" value={t("images.maxWidth")} onChange={(v) => set("images.maxWidth", v)} min={50} max={100} step={5} suffix="%" />
          <ToggleRow label="Captions" value={t("images.showCaptions")} onChange={(v) => set("images.showCaptions", v)} />
          <SelectRow label="Caption Style" value={t("images.captionStyle")} onChange={(v) => set("images.captionStyle", v)} options={[
            { id: "italic", name: "Italic" }, { id: "bold", name: "Bold" },
            { id: "underlined", name: "Underlined" }, { id: "minimal", name: "Minimal" },
          ]} />
        </Section>

        <Section title="Tables">
          <SelectRow label="Style" value={t("tables.style")} onChange={(v) => set("tables.style", v)} options={[
            { id: "striped", name: "Striped" }, { id: "bordered", name: "Bordered" },
            { id: "minimal", name: "Minimal" }, { id: "fancy", name: "Fancy" },
          ]} />
          <SelectRow label="Header" value={t("tables.headerStyle")} onChange={(v) => set("tables.headerStyle", v)} options={[
            { id: "colored", name: "Colored" }, { id: "light", name: "Light" },
            { id: "dark", name: "Dark" }, { id: "gradient", name: "Gradient" },
          ]} />
          <ToggleRow label="Striped Rows" value={t("tables.striped")} onChange={(v) => set("tables.striped", v)} />
          <ToggleRow label="Hover Effect" value={t("tables.hover")} onChange={(v) => set("tables.hover", v)} />
        </Section>

        <Section title="Callouts">
          <SelectRow label="Style" value={t("callouts.style")} onChange={(v) => set("callouts.style", v)} options={[
            { id: "border-left", name: "Left Border" }, { id: "filled", name: "Filled" },
            { id: "minimal", name: "Minimal" }, { id: "modern", name: "Modern" },
          ]} />
          <ToggleRow label="Rounded" value={t("callouts.rounded")} onChange={(v) => set("callouts.rounded", v)} />
          <ToggleRow label="Icons" value={t("callouts.showIcons")} onChange={(v) => set("callouts.showIcons", v)} />
        </Section>

        {/* Dividers */}
        <Section title="Dividers">
          <SelectRow label="Style" value={t("dividers.style")} onChange={(v) => set("dividers.style", v)} options={[
            { id: "line", name: "Line" }, { id: "dots", name: "Dots" },
            { id: "ornament", name: "Ornament" }, { id: "gradient", name: "Gradient" }, { id: "space", name: "Space" },
          ]} />
          <SliderRow label="Symbol Code" value={t("dividers.symbol")} onChange={(v) => set("dividers.symbol", v)} min={0} max={1} step={0.01} />
        </Section>

        {/* Advanced */}
        <Section title="Advanced" defaultOpen={false}>
          <SelectRow label="Footnote Style" value={t("footnotes.style")} onChange={(v) => set("footnotes.style", v)} options={[
            { id: "superscript", name: "Superscript" }, { id: "bracketed", name: "Bracketed" }, { id: "linked", name: "Linked" },
          ]} />
          <ToggleRow label="Footnote Separator" value={t("footnotes.separator")} onChange={(v) => set("footnotes.separator", v)} />
          <SelectRow label="Caption Position" value={t("captions.position")} onChange={(v) => set("captions.position", v)} options={[
            { id: "below", name: "Below" }, { id: "above", name: "Above" },
          ]} />
          <SliderRow label="Grid Gap" value={t("grids.gap")} onChange={(v) => set("grids.gap", v)} min={0.5} max={3} step={0.25} suffix="em" />
          <SliderRow label="Grid Padding" value={t("grids.padding")} onChange={(v) => set("grids.padding", v)} min={0.5} max={3} step={0.25} suffix="em" />
        </Section>

        {/* Reset */}
        <div className="py-3">
          <button
            onClick={() => onThemeChange(defaultTheme())}
            className="w-full py-2 rounded-lg text-xs font-medium transition-all"
            style={{ color: "var(--text-tertiary)", background: "var(--bg-hover)", border: "1px dashed var(--border-subtle)" }}
          >
            Reset to Default Theme
          </button>
        </div>

      </div>
    </div>
  );
}
