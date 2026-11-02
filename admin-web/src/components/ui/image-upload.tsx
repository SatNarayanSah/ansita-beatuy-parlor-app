"use client";

import { AnimatePresence, motion } from "motion/react";
import { ImagePlus, Loader2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { errorMessage, uploadImage } from "@/lib/api";
import { cn } from "@/lib/utils";

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_INPUT_BYTES = 15 * 1024 * 1024; // before resizing
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // what the server accepts
const MAX_SIDE = 1600;

/**
 * Shrink big photos before upload (phone pictures are often 4000px / 5 MB+): longest side
 * at most 1600px, re-encoded as WebP (browsers that can't encode WebP fall back to PNG,
 * which the server also accepts). GIFs are sent as they are so animations survive.
 */
async function prepare(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image couldn't be read. Try a JPG or PNG.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 600 * 1024) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  return blob && blob.size < file.size ? blob : file;
}

/**
 * Pick, drop or replace an image; it uploads straight away and `onChange` receives the
 * hosted URL to save with the record. Use instead of an "Image URL" text field.
 */
export function ImageUpload({
  label,
  value,
  onChange,
  onUploadingChange,
  hint = "JPG, PNG, WebP or GIF · large photos are resized automatically",
  shape = "wide",
  className,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (url: string) => void;
  /** Lets the form disable its Save button while an upload is still running. */
  onUploadingChange?: (uploading: boolean) => void;
  hint?: string;
  /** wide: 16:9 banner (services, offers, courses). round: profile photo (staff). square: QR codes (never cropped). */
  shape?: "wide" | "round" | "square";
  className?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null); // local copy while uploading
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [broken, setBroken] = useState<string | null>(null);

  const uploading = progress !== null;
  const shown = preview ?? (value || null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const pick = () => inputRef.current?.click();

  async function handle(file: File | undefined) {
    if (!file || uploading) return;
    if (!ACCEPT.includes(file.type)) return void toast.error("Choose a JPG, PNG, WebP or GIF image.");
    if (file.size > MAX_INPUT_BYTES) return void toast.error("That photo is over 15 MB. Choose a smaller one.");

    setPreview(URL.createObjectURL(file));
    setProgress(0);
    onUploadingChange?.(true);
    try {
      const blob = await prepare(file);
      if (blob.size > MAX_UPLOAD_BYTES) throw new Error("Even after resizing this image is over 5 MB. Choose a smaller one.");
      const uploaded = await uploadImage(blob, setProgress);
      setBroken(null);
      onChange(uploaded.url);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPreview(null);
      setProgress(null);
      onUploadingChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const round = shape === "round";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-xs font-medium tracking-wide text-ink-2">
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT.join(",")}
        className="sr-only"
        onChange={(e) => handle(e.target.files?.[0])}
        disabled={uploading}
      />

      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        animate={{ scale: dragging ? 1.015 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed transition-colors",
          dragging ? "border-primary bg-primary-soft/60" : shown ? "border-line" : "border-line-strong bg-surface-alt/60 hover:border-primary/60",
          round ? "flex items-center gap-4 p-3" : "",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {shown ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className={cn(
                "relative shrink-0 overflow-hidden bg-bg-deep",
                round ? "h-20 w-20 rounded-full" : shape === "square" ? "mx-auto my-3 aspect-square w-44 rounded-xl bg-white" : "aspect-[16/9] w-full",
              )}
            >
              {broken === shown ? (
                <div className="flex h-full w-full items-center justify-center p-2 text-center text-[11px] text-muted">Image not found</div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- uploaded files live on the API host
                <img src={shown} alt="" className={cn("h-full w-full", shape === "square" ? "object-contain p-1.5" : "object-cover")} onError={() => setBroken(shown)} />
              )}
              <AnimatePresence>
                {uploading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#2b2528]/55 text-white backdrop-blur-[2px]"
                  >
                    <Loader2 className="h-6 w-6 animate-spin" />
                    {!round && <span className="text-xs font-medium tabular-nums">Uploading {Math.round((progress ?? 0) * 100)}%</span>}
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
                      <motion.div className="h-full bg-white" animate={{ width: `${Math.max(4, (progress ?? 0) * 100)}%` }} transition={{ ease: "easeOut" }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.button
              key="empty"
              type="button"
              onClick={pick}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "group flex w-full cursor-pointer flex-col items-center justify-center gap-2 text-center",
                round ? "h-20 w-20 shrink-0 rounded-full bg-surface" : shape === "square" ? "aspect-square max-h-44 px-4" : "aspect-[16/9] max-h-56 px-4",
              )}
              aria-label={`Upload ${label.toLowerCase()}`}
            >
              <motion.span
                animate={dragging ? { y: [-2, 2, -2] } : { y: 0 }}
                transition={dragging ? { repeat: Infinity, duration: 0.9 } : undefined}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-transform duration-300 group-hover:scale-110"
              >
                {dragging ? <UploadCloud className="h-5 w-5" /> : <ImagePlus className="h-5 w-5" />}
              </motion.span>
              {!round && (
                <span className="text-sm text-ink-2">
                  <span className="font-semibold text-primary">Click to upload</span>
                  <span className="hidden sm:inline"> or drag an image here</span>
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        {/* Actions: under the banner, or beside the round photo. */}
        <div className={cn("flex flex-wrap items-center gap-2", round ? "min-w-0 flex-1" : shown ? "border-t border-line bg-surface p-2.5" : "hidden")}>
          {round && !shown && (
            <p className="mr-auto min-w-0 text-sm text-ink-2">
              <button type="button" onClick={pick} className="cursor-pointer font-semibold text-primary hover:underline">
                Upload a photo
              </button>
              <span className="hidden sm:inline"> or drag one here</span>
            </p>
          )}
          {shown && (
            <>
              <button
                type="button"
                onClick={pick}
                disabled={uploading}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={uploading}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:border-danger/50 hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </>
          )}
        </div>
      </motion.div>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
