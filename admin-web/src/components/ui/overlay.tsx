"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "./primitives";

/**
 * Closes the overlay when its route is hidden by Next's <Activity> (or unmounted),
 * so returning to a page never shows a stale dialog. Also locks page scroll and
 * closes on Escape.
 */
const overlayStack: object[] = [];

function useOverlayLifecycle(onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  // Close when the route is hidden by <Activity>. The close is deferred one tick and
  // cancelled if the effect re-runs: React Strict Mode (on in dev) mounts, unmounts and
  // re-mounts every component, and closing synchronously made overlays shut right after opening.
  const pendingClose = useRef<ReturnType<typeof setTimeout> | null>(null);
  useLayoutEffect(() => {
    if (pendingClose.current) clearTimeout(pendingClose.current);
    pendingClose.current = null;
    return () => {
      pendingClose.current = setTimeout(() => closeRef.current(), 0);
    };
  }, []);
  useEffect(() => {
    // Only the topmost overlay reacts to Escape, so a modal over a drawer closes alone.
    const token = {};
    overlayStack.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && overlayStack[overlayStack.length - 1] === token) closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      overlayStack.splice(overlayStack.indexOf(token), 1);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, []);
}

function Portal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return mounted ? createPortal(children, document.body) : null;
}

function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 bg-[#2b2528]/40 backdrop-blur-[6px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClick}
    />
  );
}

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

function ModalBody({ onClose, title, description, children, footer, className }: Omit<OverlayProps, "open">) {
  useOverlayLifecycle(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <Backdrop onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 40, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:max-w-lg sm:rounded-3xl",
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary-soft/60 to-transparent" />
        <header className="relative flex items-start justify-between gap-4 px-6 pt-6 pb-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="relative flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer && (
          <footer className="relative flex flex-wrap justify-end gap-2 border-t border-line bg-bg/60 px-6 py-4">{footer}</footer>
        )}
      </motion.div>
    </div>
  );
}

export function Modal({ open, ...props }: OverlayProps) {
  return (
    <Portal>
      <AnimatePresence>{open && <ModalBody key="modal" {...props} />}</AnimatePresence>
    </Portal>
  );
}

function DrawerBody({ onClose, title, description, children, footer, className }: Omit<OverlayProps, "open">) {
  useOverlayLifecycle(onClose);
  return (
    <div className="fixed inset-0 z-50">
      <Backdrop onClick={onClose} />
      <motion.aside
        role="dialog"
        aria-modal="true"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className={cn(
          "absolute top-0 right-0 flex h-full w-full flex-col border-l border-line bg-surface shadow-2xl sm:max-w-xl",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-semibold text-ink">{title}</h2>
            {description && <div className="mt-1 text-sm text-muted">{description}</div>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </header>
        <motion.div
          className="flex-1 overflow-y-auto px-6 py-5"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12, duration: 0.3 }}
        >
          {children}
        </motion.div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</footer>}
      </motion.aside>
    </div>
  );
}

export function Drawer({ open, ...props }: OverlayProps) {
  return (
    <Portal>
      <AnimatePresence>{open && <DrawerBody key="drawer" {...props} />}</AnimatePresence>
    </Portal>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  loading,
  tone = "danger",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  tone?: "danger" | "primary";
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-3">
          <motion.span
            initial={{ rotate: -20, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              tone === "danger" ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary",
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </motion.span>
          {title}
        </span>
      }
      className="sm:max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={tone} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-ink-2">{message}</div>
    </Modal>
  );
}
