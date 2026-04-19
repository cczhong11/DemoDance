import type { RefObject } from "react";

import type { ChatMsg } from "./types";

type WorkflowChatSidebarProps = {
  activeStepTitle: string;
  chat: ChatMsg[];
  input: string;
  chatLoading: boolean;
  chatError: string | null;
  logoGenerating: boolean;
  tr: (en: string, zh: string) => string;
  chatEndRef: RefObject<HTMLDivElement | null>;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onGenerateLogo: () => void;
};

export function WorkflowChatSidebar(props: WorkflowChatSidebarProps) {
  const {
    activeStepTitle,
    chat,
    input,
    chatLoading,
    chatError,
    logoGenerating,
    tr,
    chatEndRef,
    onInputChange,
    onSendMessage,
    onGenerateLogo,
  } = props;

  return (
    <aside className="bg-white border-l border-zinc-200 flex flex-col">
      <div className="px-5 py-3 border-b border-zinc-200">
        <h3 className="text-sm font-semibold">{tr("💬 Write Script with AI", "💬 和 AI 一起写脚本")}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          {tr("Current step:", "正在填：")}
          <span className="text-zinc-800 font-medium">{activeStepTitle}</span>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {chat.map((m, i) => (
          <div
            key={i}
            className={`max-w-[88%] text-[13px] leading-relaxed rounded-xl px-3.5 py-2.5 whitespace-pre-wrap ${
              m.role === "ai" ? "bg-zinc-100 text-zinc-800 self-start rounded-bl-sm" : "bg-black text-white self-end rounded-br-sm"
            }`}
          >
            {m.tag && <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">{m.tag}</div>}
            {m.text}
          </div>
        ))}
        {chatLoading && (
          <div className="max-w-[88%] text-[12px] leading-relaxed rounded-xl px-3.5 py-2 bg-zinc-100 text-zinc-500 self-start rounded-bl-sm">
            {tr("Thinking with prompts...", "正在结合 prompts 思考中…")}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-3 border-t border-zinc-200 bg-zinc-50">
        <div className="bg-white border border-zinc-300 rounded-xl p-2.5 focus-within:border-zinc-500">
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            disabled={chatLoading}
            placeholder={tr(
              "Chat with AI or type content directly (Enter to send · Shift+Enter newline)",
              "和 AI 聊聊，或直接写内容（Enter 发送 · Shift+Enter 换行）",
            )}
            rows={2}
            className="w-full text-[13px] resize-none focus:outline-none placeholder:text-zinc-400"
          />
          {chatError && <div className="mt-1 text-[11px] text-red-600">{chatError}</div>}
          <div className="flex items-center gap-1.5 mt-1">
            <button className="text-[11px] px-2 py-0.5 bg-zinc-100 rounded text-zinc-600 hover:bg-zinc-200">{tr("📎 Assets", "📎 素材")}</button>
            <button
              onClick={onGenerateLogo}
              disabled={logoGenerating}
              className={`text-[11px] px-2 py-0.5 rounded ${
                logoGenerating ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {logoGenerating ? tr("🎨 Generating...", "🎨 生成中...") : "🎨 Logo"}
            </button>
            <button className="text-[11px] px-2 py-0.5 bg-zinc-100 rounded text-zinc-600 hover:bg-zinc-200">{tr("🔗 Links", "🔗 链接")}</button>
            <div className="flex-1" />
            <button
              onClick={onSendMessage}
              disabled={chatLoading || !input.trim()}
              className={`w-7 h-7 rounded-md text-white text-sm ${
                chatLoading || !input.trim() ? "bg-zinc-300 cursor-not-allowed" : "bg-black hover:bg-zinc-700"
              }`}
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
