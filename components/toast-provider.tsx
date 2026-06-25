"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: "var(--bg-elevated)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "12px",
          fontSize: "13px",
          boxShadow: "var(--shadow-lg)",
        },
        success: {
          iconTheme: { primary: "var(--accent)", secondary: "var(--bg-elevated)" },
        },
        error: {
          iconTheme: { primary: "#ef4444", secondary: "var(--bg-elevated)" },
        },
      }}
    />
  );
}
