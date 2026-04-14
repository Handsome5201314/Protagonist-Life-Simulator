"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Activity,
  Bot,
  BrainCircuit,
  CheckCircle2,
  FileCode2,
  GitMerge,
  History,
  Lock,
  LogOut,
  MessageSquareText,
  PanelLeft,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Wrench,
  XCircle,
} from "lucide-react";

import { pickLocale, type Locale } from "@/lib/i18n";
import type { ProjectChangeHistoryEntry, ProjectChangeProposal } from "@/lib/types";

type Props = {
  locale: Locale;
  authenticated: boolean;
  configured: boolean;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ProposalPayload = {
  ok: boolean;
  proposal?: ProjectChangeProposal;
  historyEntry?: ProjectChangeHistoryEntry;
  proposals?: ProjectChangeProposal[];
  history?: ProjectChangeHistoryEntry[];
  error?: string;
};

type RightTab = "proposals" | "history";

const AGENTS = ["superadmin", "main", "director", "dating", "arena"] as const;

function statusTone(status?: "passed" | "failed") {
  if (status === "passed") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
  if (status === "failed") return "border-rose-500/30 bg-rose-500/15 text-rose-200";
  return "border-white/10 bg-white/5 text-white/60";
}

function proposalTone(status: ProjectChangeProposal["status"]) {
  if (status === "applied") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
  if (status === "rolled_back") return "border-amber-500/30 bg-amber-500/15 text-amber-200";
  return "border-cyan-500/30 bg-cyan-500/15 text-cyan-200";
}

function historyTone(action: ProjectChangeHistoryEntry["action"]) {
  return action === "rollback"
    ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
    : "border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-200";
}

export function SuperAdminConsole({ locale, authenticated, configured }: Props) {
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);

  const [password, setPassword] = useState("");
  const [agentId, setAgentId] = useState<(typeof AGENTS)[number]>("superadmin");
  const [input, setInput] = useState(
    locale === "zh"
      ? "请给我一个精确到文件级的方案，让 OpenClaw 真正参与项目改造。"
      : "Give me a file-level plan to let OpenClaw participate in real project changes."
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [proposals, setProposals] = useState<ProjectChangeProposal[]>([]);
  const [history, setHistory] = useState<ProjectChangeHistoryEntry[]>([]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [rightTab, setRightTab] = useState<RightTab>("proposals");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = useMemo(
    () => [
      locale === "zh"
        ? "请给我一个精确到文件级的方案，让 OpenClaw 真正参与项目改造。"
        : "Give me a file-level plan to let OpenClaw participate in real project changes.",
      locale === "zh"
        ? "请给我一份提案，只改 dating 房内视角坍塌的问题。"
        : "Generate a proposal that only fixes the perspective collapse in the dating room.",
      locale === "zh"
        ? "请指出当前最危险的架构债务，并给出可回滚的改造顺序。"
        : "Point out the riskiest architecture debt and propose a rollback-safe change order.",
    ],
    [locale]
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!authenticated) return;
    void fetch("/api/super-admin/proposals", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        setProposals(payload.proposals || []);
        setHistory(payload.history || []);
      })
      .catch(() => {});
  }, [authenticated]);

  async function login() {
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/super-admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || t("Login failed", "登录失败"));
        window.location.reload();
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : t("Login failed", "登录失败"));
      }
    });
  }

  async function logout() {
    await fetch("/api/super-admin/logout", { method: "POST" });
    window.location.reload();
  }

  async function send() {
    if (!input.trim()) return;
    const nextMessages = [...messages, { role: "user" as const, content: input.trim() }];
    setMessages(nextMessages);
    setInput("");
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/super-admin/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, messages: nextMessages }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || t("Chat failed", "对话失败"));
        setMessages((prev) => [...prev, { role: "assistant", content: payload.reply }]);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : t("Chat failed", "对话失败"));
      }
    });
  }

  async function generateProposal() {
    if (!input.trim()) return;
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/super-admin/proposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: input, agentId }),
        });
        const payload = (await response.json()) as ProposalPayload;
        if (!response.ok || !payload.proposal) {
          throw new Error(payload.error || t("Failed to generate proposal", "生成提案失败"));
        }
        setProposals((prev) => [payload.proposal!, ...prev]);
        setRightTab("proposals");
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : t("Failed to generate proposal", "生成提案失败"));
      }
    });
  }

  async function applyProposal(proposalId: string) {
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/super-admin/proposals/${proposalId}/apply`, { method: "POST" });
        const payload = (await response.json()) as ProposalPayload;
        if (!response.ok || !payload.historyEntry) {
          throw new Error(payload.error || t("Failed to apply proposal", "应用提案失败"));
        }
        setHistory((prev) => [payload.historyEntry!, ...prev]);
        setProposals((prev) => prev.map((proposal) => (proposal.id === proposalId ? { ...proposal, status: "applied" } : proposal)));
        setRightTab("history");
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : t("Failed to apply proposal", "应用提案失败"));
      }
    });
  }

  async function rollbackHistory(historyId: string) {
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/super-admin/history/${historyId}/rollback`, { method: "POST" });
        const payload = (await response.json()) as ProposalPayload;
        if (!response.ok || !payload.historyEntry) {
          throw new Error(payload.error || t("Failed to rollback change", "回滚失败"));
        }
        setHistory((prev) => [payload.historyEntry!, ...prev]);
        setRightTab("history");
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : t("Failed to rollback change", "回滚失败"));
      }
    });
  }

  if (!configured) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#0f0c29]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-[28px] border border-rose-500/25 bg-black/35 p-8 shadow-2xl backdrop-blur-2xl">
            <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-rose-500/30 bg-rose-500/15 text-rose-300">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h1 className="text-center text-2xl font-black text-white">{t("Super admin is not configured", "超级管理员未配置")}</h1>
            <p className="mt-4 text-center text-sm leading-7 text-white/60">
              {t(
                "Set SUPER_ADMIN_PASSWORD and SUPER_ADMIN_SESSION_SECRET in the server environment first.",
                "请先在环境变量里设置 SUPER_ADMIN_PASSWORD 和 SUPER_ADMIN_SESSION_SECRET。"
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#0f0c29]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]" />
        <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/12 blur-[140px]" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-black/35 p-8 shadow-2xl backdrop-blur-2xl">
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-pink-600 to-purple-600 shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-pink-300">{t("Private Entry", "私有入口")}</p>
              <h1 className="mt-3 text-3xl font-black text-white">OpenClaw Console</h1>
              <p className="mt-3 text-sm leading-7 text-white/55">
                {t(
                  "Protected operator entry for the project owner.",
                  "项目主理人的专属受保护入口。"
                )}
              </p>
            </div>

            <div className="space-y-5">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/25" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && void login()}
                  placeholder={t("Enter admin password", "输入管理员密码")}
                  className="w-full rounded-2xl border border-white/10 bg-[#0a0a14] py-4 pl-12 pr-4 text-sm text-white placeholder:text-white/25 focus:border-pink-500/40 focus:outline-none"
                />
              </div>
              <button
                onClick={() => void login()}
                disabled={isPending || !password.trim()}
                className="w-full rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 py-4 text-sm font-bold text-white shadow-[0_0_24px_rgba(236,72,153,0.28)] transition hover:translate-y-[-1px] disabled:opacity-50"
              >
                {isPending ? t("Authenticating...", "验证中...") : t("Initialize Console", "初始化控制台")}
              </button>
              {error ? <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div> : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f0c29] text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]" />
      <div className="absolute left-[-6%] top-[6%] h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/10 blur-[140px]" />
      <div className="absolute bottom-[-10%] right-[-4%] h-[24rem] w-[24rem] rounded-full bg-cyan-500/8 blur-[140px]" />

      <div className="relative z-10 flex min-h-screen">
        <aside className="flex w-[74px] shrink-0 flex-col items-center justify-between border-r border-white/10 bg-black/30 py-5 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-pink-600 to-purple-600 shadow-[0_0_22px_rgba(236,72,153,0.28)]">
              <TerminalSquare className="h-5 w-5 text-white" />
            </div>
            <button className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-200">
              <MessageSquareText className="h-5 w-5" />
            </button>
            <button
              onClick={() => setRightTab("proposals")}
              className={`grid h-11 w-11 place-items-center rounded-2xl border ${
                rightTab === "proposals"
                  ? "border-pink-500/30 bg-pink-500/15 text-pink-200"
                  : "border-white/10 bg-white/5 text-white/45 hover:text-white"
              }`}
            >
              <GitMerge className="h-5 w-5" />
            </button>
            <button
              onClick={() => setRightTab("history")}
              className={`grid h-11 w-11 place-items-center rounded-2xl border ${
                rightTab === "history"
                  ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
                  : "border-white/10 bg-white/5 text-white/45 hover:text-white"
              }`}
            >
              <History className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={() => void logout()}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/50 transition hover:border-rose-500/30 hover:bg-rose-500/15 hover:text-rose-200"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </aside>

        <div className="grid min-h-screen flex-1 grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)_420px]">
          <section className="border-r border-white/10 bg-black/25 p-4 backdrop-blur-xl">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-white/45">
                <PanelLeft className="h-3.5 w-3.5 text-cyan-300" />
                {t("Workspace", "工作区")}
              </div>
              <h2 className="mt-3 text-xl font-black text-white">OpenClaw</h2>
              <p className="mt-2 text-sm leading-7 text-white/58">
                {t(
                  "Project control surface for architecture review, proposal generation, and controlled apply / rollback.",
                  "用于架构审查、提案生成、受控应用与回滚的项目控制台。"
                )}
              </p>
            </div>

            <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-white/45">
                <Activity className="h-3.5 w-3.5 text-cyan-300" />
                {t("Target Agent", "目标 Agent")}
              </div>
              <div className="mt-4 space-y-2">
                {AGENTS.map((item) => (
                  <button
                    key={item}
                    onClick={() => setAgentId(item)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      item === agentId
                        ? "border-cyan-500/40 bg-cyan-500/12 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.12)]"
                        : "border-white/10 bg-black/20 text-white/55 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <BrainCircuit className="h-4 w-4" />
                    <span className="text-sm font-semibold">@{item}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-white/45">
                <Sparkles className="h-3.5 w-3.5 text-pink-300" />
                {t("Quick Prompts", "快捷问题")}
              </div>
              <div className="mt-4 space-y-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm leading-6 text-white/72 transition hover:bg-white/[0.06]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="flex min-h-screen flex-col bg-black/15">
            <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-black/25 px-6 py-4 backdrop-blur-xl">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.26em] text-white/35">{t("Operator Session", "主理会话")}</p>
                <h1 className="mt-1 text-2xl font-black text-white">{t("OpenClaw Operator Console", "OpenClaw 主理控制台")}</h1>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">@{agentId}</div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {messages.length === 0 ? (
                <div className="flex h-full min-h-[30rem] flex-col items-center justify-center rounded-[28px] border border-white/10 bg-white/5 px-8 text-center backdrop-blur-xl">
                  <Bot className="mb-4 h-12 w-12 text-white/25" />
                  <h2 className="text-xl font-bold text-white">{t("Console Ready", "控制台已就绪")}</h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-white/55">
                    {t(
                      "Ask for architecture advice, or generate a concrete code proposal directly from the composer below.",
                      "你可以直接发起架构问题，或者从下方编辑器里生成一份具体代码提案。"
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-[26px] border p-5 shadow-lg ${
                        message.role === "user"
                          ? "border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-purple-500/10 text-pink-50"
                          : "border-white/10 bg-black/40 font-mono text-[13px] text-white/82"
                      }`}>
                        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-white/35">
                          {message.role === "user" ? <Wrench className="h-3.5 w-3.5 text-pink-300" /> : <Bot className="h-3.5 w-3.5 text-cyan-300" />}
                          {message.role === "user" ? t("Operator", "主理人") : `OpenClaw / ${agentId}`}
                        </div>
                        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}>{message.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <footer className="border-t border-white/10 bg-black/25 p-5 backdrop-blur-xl">
              <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={`footer-${prompt}`}
                    onClick={() => setInput(prompt)}
                    className="whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/55 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#0a0a14] p-4">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={t("Enter request or generate a concrete proposal...", "输入需求，或直接生成一份具体提案...")}
                  className="h-[120px] w-full resize-none bg-transparent text-sm leading-7 text-white outline-none placeholder:text-white/24"
                />
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-xs text-white/35">{t("Current target", "当前目标")} @{agentId}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void send()}
                      disabled={isPending || !input.trim()}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      {t("Send", "发送")}
                    </button>
                    <button
                      onClick={() => void generateProposal()}
                      disabled={isPending || !input.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(236,72,153,0.22)] transition hover:translate-y-[-1px] disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      {t("Generate Proposal", "生成提案")}
                    </button>
                  </div>
                </div>
              </div>

              {error ? (
                <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {error}
                </div>
              ) : null}
            </footer>
          </section>

          <aside className="border-l border-white/10 bg-black/30 backdrop-blur-xl">
            <div className="flex items-center gap-1 border-b border-white/10 px-4 py-4">
              <button
                onClick={() => setRightTab("proposals")}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  rightTab === "proposals"
                    ? "bg-pink-500/15 text-pink-200"
                    : "text-white/45 hover:bg-white/5 hover:text-white"
                }`}
              >
                {t("Proposals", "提案")}
              </button>
              <button
                onClick={() => setRightTab("history")}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  rightTab === "history"
                    ? "bg-cyan-500/15 text-cyan-200"
                    : "text-white/45 hover:bg-white/5 hover:text-white"
                }`}
              >
                {t("History", "历史")}
              </button>
            </div>

            <div className="h-[calc(100vh-88px)] overflow-y-auto p-4">
              {rightTab === "proposals" ? (
                proposals.length ? (
                  <div className="space-y-4">
                    {proposals.map((proposal) => (
                      <div key={proposal.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-lg">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-base font-bold leading-6 text-white">{proposal.summary}</h3>
                          <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${proposalTone(proposal.status)}`}>
                            {proposal.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-white/35">{proposal.createdAt}</p>

                        <div className="mt-4 space-y-3">
                          {proposal.changes.map((change) => (
                            <div key={`${proposal.id}-${change.path}`} className="rounded-[18px] border border-white/10 bg-[#0a0a14] p-4">
                              <div className="text-sm font-semibold text-cyan-200">{change.path}</div>
                              <div className="mt-1 text-xs text-white/35">{change.reason}</div>
                              <pre className="mt-3 max-h-44 overflow-auto rounded-xl border border-white/5 bg-black/40 p-3 font-mono text-[11px] leading-6 text-emerald-300/80">
                                {change.diff}
                              </pre>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => void applyProposal(proposal.id)}
                          disabled={isPending || proposal.status === "applied"}
                          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-pink-500/30 hover:bg-pink-500/15 hover:text-pink-200 disabled:opacity-50"
                        >
                          {proposal.status === "applied" ? <CheckCircle2 className="h-4 w-4" /> : <GitMerge className="h-4 w-4" />}
                          {proposal.status === "applied" ? t("Already Applied", "已应用") : t("Apply Proposal", "应用提案")}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[20rem] items-center justify-center rounded-[24px] border border-white/10 bg-white/5 px-6 text-center text-sm text-white/40">
                    {t("No proposals yet.", "还没有提案。")}
                  </div>
                )
              ) : history.length ? (
                <div className="space-y-4">
                  {history.map((entry, index) => (
                    <div key={entry.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-lg">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-bold leading-6 text-white">{entry.summary}</h3>
                        <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${historyTone(entry.action)}`}>
                          {entry.action}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-white/35">{entry.createdAt}</p>

                      {entry.verification ? (
                        <div className="mt-4 rounded-[18px] border border-white/10 bg-[#0a0a14] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/40">
                              <Play className="h-3.5 w-3.5 text-cyan-300" />
                              {t("Build Check", "构建校验")}
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${statusTone(entry.verification.status)}`}>
                              {entry.verification.status}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-white/35">{entry.verification.command}</div>
                          <pre className="mt-3 max-h-40 overflow-auto rounded-xl border border-white/5 bg-black/40 p-3 font-mono text-[10px] leading-5 text-white/60">
                            {entry.verification.status === "passed"
                              ? entry.verification.stdout || "Build passed."
                              : entry.verification.stderr || entry.verification.stdout || "Build failed."}
                          </pre>
                        </div>
                      ) : null}

                      <div className="mt-4 space-y-2">
                        {entry.files.map((file) => (
                          <div key={`${entry.id}-${file.path}`} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70">
                            {file.path}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => void rollbackHistory(entry.id)}
                        disabled={isPending || index !== 0 || entry.action === "rollback"}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-40"
                      >
                        {entry.action === "rollback" ? <XCircle className="h-4 w-4" /> : <History className="h-4 w-4" />}
                        {index === 0 && entry.action !== "rollback" ? t("Rollback This Change", "回滚这次变更") : t("Rollback Unavailable", "当前不可回滚")}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full min-h-[20rem] items-center justify-center rounded-[24px] border border-white/10 bg-white/5 px-6 text-center text-sm text-white/40">
                  {t("No change history yet.", "还没有改动历史。")}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
