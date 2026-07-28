"use client";

import { useState, useRef, useCallback } from "react";
import type { EbookProject, EbookCover } from "@/lib/ebook-storage";

interface CoverEditorProps {
  project: EbookProject;
  onChange: (updates: Partial<EbookProject>) => void;
}

const layouts: { id: EbookCover["layout"]; label: string }[] = [
  { id: "centered", label: "Centered" },
  { id: "split", label: "Split" },
  { id: "minimal", label: "Minimal" },
  { id: "bold", label: "Bold" },
];

const COVER_GUIDE = {
  recommended: { width: 1600, height: 2560, label: "6\" × 9\" (KDP)" },
  formats: ["JPEG", "PNG", "WebP"],
  maxSize: "10MB",
  tips: [
    "Use 1600×2560px for 6\"×9\" trim size (KDP recommended)",
    "Minimum 300 DPI for print quality",
    "Aspect ratio should be ~1:1.6 (width:height)",
    "Keep important text/elements in safe zone (center 90%)",
    "Spine text only needed if book is 100+ pages",
  ],
};

export default function CoverEditor({ project, onChange }: CoverEditorProps) {
  const cover = project.cover;
  const [showResizer, setShowResizer] = useState(false);
  const [resizeWidth, setResizeWidth] = useState(1600);
  const [resizeHeight, setResizeHeight] = useState(2560);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");

  const updateCover = (updates: Partial<EbookCover>) => {
    onChange({ cover: { ...cover, ...updates } });
  };

  const handleImageUpload = useCallback((file: File) => {
    setUploadError("");
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image must be under 10MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("Only JPEG, PNG, or WebP images are supported");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      updateCover({ coverImage: dataUrl });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload]);

  const handleRemoveImage = () => {
    updateCover({ coverImage: "" });
  };

  const handleResize = useCallback(() => {
    if (!cover.coverImage) return;
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = resizeWidth;
      canvas.height = resizeHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, resizeWidth, resizeHeight);
      const mimeType = cover.coverImage.startsWith("data:image/png") ? "image/png" :
        cover.coverImage.startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
      const quality = mimeType === "image/jpeg" ? 0.92 : 1;
      const resized = canvas.toDataURL(mimeType, quality);
      updateCover({ coverImage: resized });
      setShowResizer(false);
    };
    img.src = cover.coverImage;
  }, [cover.coverImage, resizeWidth, resizeHeight]);

  const handleConvertFormat = useCallback((format: "image/jpeg" | "image/png" | "image/webp") => {
    if (!cover.coverImage) return;
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const quality = format === "image/jpeg" ? 0.92 : 1;
      const resized = canvas.toDataURL(format, quality);
      updateCover({ coverImage: resized });
    };
    img.src = cover.coverImage;
  }, [cover.coverImage]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Cover Design</h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>Customize your book cover</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Show Cover Page Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Show Cover Page</label>
          <button
            onClick={() => updateCover({ showCoverPage: !cover.showCoverPage })}
            className="relative w-10 h-5 rounded-full transition-all"
            style={{
              background: cover.showCoverPage ? "var(--accent)" : "var(--border-subtle)",
            }}
          >
            <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all"
              style={{ transform: cover.showCoverPage ? "translateX(20px)" : "translateX(0)" }}
            />
          </button>
        </div>

        {/* Layout */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Layout</label>
          <div className="grid grid-cols-4 gap-1.5">
            {layouts.map((l) => (
              <button
                key={l.id}
                onClick={() => updateCover({ layout: l.id })}
                className="py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: cover.layout === l.id ? "var(--accent-bg)" : "var(--bg-hover)",
                  color: cover.layout === l.id ? "var(--accent)" : "var(--text-tertiary)",
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cover Image Upload */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Cover Image
          </label>
          {cover.coverImage ? (
            <div className="space-y-2">
              <div className="relative rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
                <img src={cover.coverImage} alt="Cover preview" className="w-full h-48 object-contain" style={{ background: "#f0f0f0" }} />
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={handleRemoveImage}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                  style={{ background: "var(--bg-hover)", color: "#ef4444", border: "1px solid var(--border-subtle)" }}
                >
                  Remove
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                  style={{ background: "var(--bg-hover)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
                >
                  Replace
                </button>
                <button
                  onClick={() => { setShowResizer(!showResizer); setResizeWidth(1600); setResizeHeight(2560); }}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                  style={{ background: showResizer ? "var(--accent-bg)" : "var(--bg-hover)", color: showResizer ? "var(--accent)" : "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
                >
                  Resize
                </button>
              </div>
              {/* Format conversion */}
              <div className="flex gap-1.5">
                <button onClick={() => handleConvertFormat("image/jpeg")} className="flex-1 py-1 rounded text-[9px] font-medium transition-all" style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}>Convert to JPEG</button>
                <button onClick={() => handleConvertFormat("image/png")} className="flex-1 py-1 rounded text-[9px] font-medium transition-all" style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}>Convert to PNG</button>
                <button onClick={() => handleConvertFormat("image/webp")} className="flex-1 py-1 rounded text-[9px] font-medium transition-all" style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}>Convert to WebP</button>
              </div>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl p-6 text-center cursor-pointer transition-all"
              style={{ background: "var(--bg-hover)", border: "2px dashed var(--border-subtle)" }}
            >
              <div className="text-2xl mb-1">📷</div>
              <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Upload Cover Image</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                Drop an image or click to browse
              </p>
              <p className="text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>
                {COVER_GUIDE.formats.join(", ")} · {COVER_GUIDE.maxSize} max
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
            }}
          />
          {uploadError && (
            <p className="text-[10px] mt-1" style={{ color: "#ef4444" }}>{uploadError}</p>
          )}
        </div>

        {/* Resize Tool */}
        {showResizer && cover.coverImage && (
          <div className="rounded-xl p-3 space-y-3" style={{ background: "var(--bg-hover)", border: "1px solid var(--border-subtle)" }}>
            <h4 className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Resize Image</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Width (px)</label>
                <input type="number" value={resizeWidth} onChange={(e) => setResizeWidth(parseInt(e.target.value) || 1)}
                  className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                  style={{ background: "var(--bg-page)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Height (px)</label>
                <input type="number" value={resizeHeight} onChange={(e) => setResizeHeight(parseInt(e.target.value) || 1)}
                  className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                  style={{ background: "var(--bg-page)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
                />
              </div>
            </div>
            <button
              onClick={handleResize}
              className="w-full py-1.5 rounded-lg text-xs font-medium transition-all text-white"
              style={{ background: "var(--accent)" }}
            >
              Apply Resize
            </button>
          </div>
        )}

        {/* Format & Size Guide */}
        <div className="rounded-xl p-3" style={{ background: "var(--bg-hover)" }}>
          <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            Image Format & Size Guide
          </h4>
          <ul className="space-y-1">
            {COVER_GUIDE.tips.map((tip, i) => (
              <li key={i} className="text-[10px] flex gap-1.5" style={{ color: "var(--text-tertiary)" }}>
                <span style={{ color: "var(--accent)" }}>{"\u2022"}</span>
                {tip}
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2 text-[9px]" style={{ color: "var(--text-muted)" }}>
            <span>Recommended: {COVER_GUIDE.recommended.width}×{COVER_GUIDE.recommended.height}px</span>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Title</label>
          <input
            value={cover.title}
            onChange={(e) => updateCover({ title: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
            style={{ background: "var(--bg-hover)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
          />
        </div>

        {/* Subtitle */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Subtitle</label>
          <input
            value={cover.subtitle}
            onChange={(e) => updateCover({ subtitle: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
            style={{ background: "var(--bg-hover)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
          />
        </div>

        {/* Author */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Author</label>
          <input
            value={cover.author}
            onChange={(e) => updateCover({ author: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
            style={{ background: "var(--bg-hover)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
          />
        </div>

        {/* Colors */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Background</label>
            <input
              type="color"
              value={cover.bgColor}
              onChange={(e) => updateCover({ bgColor: e.target.value })}
              className="w-full h-9 rounded-lg cursor-pointer"
              style={{ background: "var(--bg-hover)", border: "1px solid var(--border-subtle)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Text</label>
            <input
              type="color"
              value={cover.textColor}
              onChange={(e) => updateCover({ textColor: e.target.value })}
              className="w-full h-9 rounded-lg cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Accent</label>
            <input
              type="color"
              value={cover.accentColor}
              onChange={(e) => updateCover({ accentColor: e.target.value })}
              className="w-full h-9 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Title font size */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Title Size: {cover.titleFontSize}px
          </label>
          <input
            type="range"
            min={24}
            max={72}
            value={cover.titleFontSize}
            onChange={(e) => updateCover({ titleFontSize: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Live Cover Preview */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Preview</label>
          <div
            className="rounded-xl flex flex-col items-center justify-center text-center overflow-hidden"
            style={{
              background: cover.coverImage ? "#000" : cover.bgColor,
              minHeight: "220px",
              border: "1px solid var(--border-subtle)",
              position: "relative",
            }}
          >
            {cover.coverImage ? (
              <img src={cover.coverImage} alt="" className="w-full h-full object-cover absolute inset-0" />
            ) : (
              <div className="relative z-10 p-4">
                <h3
                  style={{
                    color: cover.textColor,
                    fontSize: `${cover.titleFontSize * 0.45}px`,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    marginBottom: "0.3em",
                  }}
                >
                  {cover.title || "Book Title"}
                </h3>
                {cover.subtitle && (
                  <p style={{ color: cover.accentColor, fontSize: "13px", marginBottom: "0.5em" }}>
                    {cover.subtitle}
                  </p>
                )}
                <p style={{ color: cover.textColor, opacity: 0.7, fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  {cover.author || "Author"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
