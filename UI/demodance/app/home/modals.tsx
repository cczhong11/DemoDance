import type { RefObject } from "react";

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
  previewVideoRef: RefObject<HTMLVideoElement | null>;
  formatTime: (sec: number) => string;
  tr: (en: string, zh: string) => string;
  onClose: () => void;
};

export function SegmentPreviewModal({
  segment,
  demoVideo,
  previewVideoRef,
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
          {demoVideo?.url ? (
            <video
              ref={previewVideoRef}
              src={demoVideo.url}
              controls
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <div className="text-5xl mb-2">{segment.emoji}</div>
              <div className="text-xs opacity-80">{tr("No demo uploaded · showing placeholder storyboard", "没上传 demo 视频 · 显示占位分镜")}</div>
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
