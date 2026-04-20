import { useEffect, useRef } from "react";
import type { DemoVideoMeta, FeatureSegment } from "./types";

type PromptPreviewModalProps = {
  title: string;
  content: string | null;
  sources: string[];
  onClose: () => void;
};

export function PromptPreviewModal({ title, content, sources, onClose }: PromptPreviewModalProps) {
  if (!content) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-4 w-[900px] max-w-full shadow-xl max-h-[86vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Split sub-prompts used:
              {sources.length > 0 ? ` ${sources.join(" | ")}` : " (none)"}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-800 text-lg leading-none">
            ×
          </button>
        </div>

        <pre className="flex-1 overflow-auto text-[12px] leading-relaxed bg-zinc-50 border border-zinc-200 rounded-md p-3 whitespace-pre-wrap">
          {content}
        </pre>
      </div>
    </div>
  );
}

type SectionPromptModalProps = {
  open: boolean;
  title: string;
  value: string;
  resetLabel: string;
  closeLabel: string;
  onChange: (next: string) => void;
  onReset: () => void;
  onClose: () => void;
};

export function SectionPromptModal({
  open,
  title,
  value,
  resetLabel,
  closeLabel,
  onChange,
  onReset,
  onClose,
}: SectionPromptModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-4 w-[900px] max-w-full shadow-xl max-h-[86vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-sm font-semibold">{title}</div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-800 text-lg leading-none">
            ×
          </button>
        </div>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={16}
          className="flex-1 w-full rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[12px] leading-relaxed text-zinc-800 resize-y focus:outline-none focus:ring-1 focus:ring-zinc-300"
        />

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={onReset}
            className="text-xs px-3 py-1.5 rounded border border-zinc-300 hover:bg-zinc-100"
          >
            {resetLabel}
          </button>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded bg-black text-white hover:bg-zinc-800"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type PromptErrorToastProps = {
  message: string | null;
  label: string;
  className: string;
};

export function PromptErrorToast({ message, label, className }: PromptErrorToastProps) {
  if (!message) return null;

  return (
    <div className={className}>
      {label}: {message}
    </div>
  );
}

type SegmentPreviewModalProps = {
  segment: FeatureSegment | null;
  demoVideo: DemoVideoMeta | null;
  formatTime: (sec: number) => string;
  tr: (en: string, zh: string) => string;
  onClose: () => void;
};

export function SegmentPreviewModal({
  segment,
  demoVideo,
  formatTime,
  tr,
  onClose,
}: SegmentPreviewModalProps) {
  if (!segment) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-4 w-[560px] max-w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold">{segment.label}</div>
            <div className="text-[11px] text-zinc-500 tabular-nums">
              {formatTime(segment.start)} – {formatTime(segment.end)} · {tr("from raw demo", "来自原始 demo")}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-800 text-lg leading-none">
            ×
          </button>
        </div>

        <div
          className="relative rounded-lg overflow-hidden aspect-video"
          style={{
            background: `linear-gradient(135deg, ${segment.accent} 0%, #111 100%)`,
          }}
        >
          {segment.clipUrl ? (
            <video
              src={segment.clipUrl}
              controls
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <div className="text-5xl mb-2">{segment.emoji}</div>
              <div className="text-xs opacity-80">
                {demoVideo?.url
                  ? tr("Clip not ready yet", "切片暂未就绪")
                  : tr("No demo uploaded · showing placeholder storyboard", "没上传 demo 视频 · 显示占位分镜")}
              </div>
              <div className="mt-3 text-[11px] bg-white/20 px-2 py-0.5 rounded-full tabular-nums">
                ▶ {formatTime(segment.start)} – {formatTime(segment.end)}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 text-[13px] leading-relaxed text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2">
          {segment.caption}
        </div>
      </div>
    </div>
  );
}

type VideoJsPreviewModalProps = {
  title: string;
  src: string | null;
  onClose: () => void;
};

export function VideoJsPreviewModal({ title, src, onClose }: VideoJsPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<{
    dispose: () => void;
    src: (source: { src: string; type: string }) => void;
  } | null>(null);

  useEffect(() => {
    if (!src || !videoRef.current) return;

    let mounted = true;

    (async () => {
      const videojs = (await import("video.js")).default;
      if (!mounted || !videoRef.current) return;

      if (!playerRef.current) {
        playerRef.current = videojs(videoRef.current, {
          controls: true,
          autoplay: false,
          preload: "auto",
          fluid: true,
        });
      }

      playerRef.current.src({ src, type: "video/mp4" });
    })();

    return () => {
      mounted = false;
    };
  }, [src]);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  if (!src) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-4 w-[900px] max-w-full shadow-xl max-h-[86vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <link rel="stylesheet" href="https://vjs.zencdn.net/8.23.4/video-js.css" />
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-sm font-semibold">{title}</div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-800 text-lg leading-none">
            ×
          </button>
        </div>

        <div className="w-full bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="video-js vjs-default-skin vjs-big-play-centered w-full h-full"
            playsInline
          />
        </div>
      </div>
    </div>
  );
}
