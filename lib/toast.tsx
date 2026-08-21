"use client";

import toastLib from "react-hot-toast";

type ToastKind = "success" | "error" | "info";

interface ToastOpts {
  duration?: number;
  id?: string;
}

function show(message: string, kind: ToastKind, opts?: ToastOpts) {
  return toastLib.custom(
    (t) => (
      <div
        className={`app-toast app-toast-${kind}${t.visible ? " app-toast-visible" : " app-toast-hidden"}`}
        role="status"
      >
        <span className="app-toast-icon" aria-hidden>
          {kind === "success" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : kind === "error" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          )}
        </span>
        <span className="app-toast-msg">{message}</span>
        <button
          className="app-toast-close"
          aria-label="Dismiss notification"
          onClick={(e) => { e.stopPropagation(); toastLib.dismiss(t.id); }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    ),
    {
      id: opts?.id,
      duration: opts?.duration ?? (kind === "error" ? 6000 : 3200),
    }
  );
}

export const toast = Object.assign(
  (message: string, opts?: ToastOpts) => show(message, "info", opts),
  {
    success: (message: string, opts?: ToastOpts) => show(message, "success", opts),
    error: (message: string, opts?: ToastOpts) => show(message, "error", opts),
    message: (message: string, opts?: ToastOpts) => show(message, "info", opts),
    dismiss: (id?: string) => toastLib.dismiss(id),
    remove: (id?: string) => toastLib.remove(id),
    loading: (message: string, opts?: ToastOpts) =>
      show(message, "info", { duration: -1, id: opts?.id }),
    custom: toastLib.custom.bind(toastLib),
    promise: toastLib.promise.bind(toastLib),
  }
);

export default toast;
