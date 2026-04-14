import type { ArenaMatch, ArenaMessage, MatchParticipant, PersonaSnapshot } from "@/lib/types";

const palettes = [
  ["from-pink-400 via-fuchsia-500 to-purple-500", "border-pink-300/20 bg-pink-400/10", "text-pink-100"],
  ["from-cyan-400 via-sky-500 to-indigo-500", "border-cyan-300/20 bg-cyan-400/10", "text-cyan-100"],
  ["from-violet-400 via-purple-500 to-fuchsia-500", "border-violet-300/20 bg-violet-400/10", "text-violet-100"],
  ["from-amber-300 via-orange-400 to-rose-500", "border-amber-300/20 bg-amber-400/10", "text-amber-100"],
] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const splitText = (text: string): string[] => {
  if (!text || !text.trim()) return [];
  const paragraphs = text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  if (paragraphs.length > 1) return paragraphs;

  const sentences = text
    .replace(/([。！？.!?])([^\s])/g, "$1\n$2")
    .split(/\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 5);

  return sentences.length > 1 ? sentences : [text.trim()];
};

export function buildParticipantCards(participants: MatchParticipant[], personas: PersonaSnapshot[]) {
  const maxScore = Math.max(...participants.map((item) => item.totalScore), 0);

  return participants.map((participant, index) => {
    const persona = personas.find((item) => item.id === participant.personaId);
    const [avatarTone, bubbleTone, textTone] = palettes[index % palettes.length];

    return {
      id: participant.id,
      name: participant.displayName,
      tags: persona?.publicTraitTags.slice(0, 3) ?? ["暂无标签"],
      supportTotal: participant.supportTotal,
      totalScore: participant.totalScore,
      resonance: clamp(46 + participant.totalScore * 7 + participant.supportTotal * 2, 8, 100),
      pressure: clamp(28 + Math.max(maxScore - participant.totalScore, 0) * 8 + (participant.eliminated ? 24 : 0), 6, 100),
      isUserOwned: participant.isUserOwned,
      eliminated: participant.eliminated,
      avatarTone,
      bubbleTone,
      textTone,
    };
  });
}

export function buildStoryFeed(match: ArenaMatch, streamChunks: string[], liveMessages: ArenaMessage[] = []) {
  const feed: Array<
    | { id: string; kind: "system"; title: string; text: string }
    | { id: string; kind: "speaker"; speakerId: string; action?: string; dialogue?: string; text?: string }
  > = [];

  function pushMessages(messages: ArenaMessage[]) {
    messages.forEach((message) => {
      if (message.speaker === "system") {
        if (message.text) {
          feed.push({ id: message.id, kind: "system", title: "旁白", text: message.text });
        }
        return;
      }

      if (message.participantId) {
        feed.push({
          id: message.id,
          kind: "speaker",
          speakerId: message.participantId,
          action: message.action,
          dialogue: message.dialogue,
          text: message.text,
        });
      }
    });
  }

  match.roundStates.forEach((round) => {
    feed.push({
      id: `round-${round.round}`,
      kind: "system",
      title: `Round ${round.round} · ${round.title}`,
      text: round.status === "pending" ? "等待下一次触发，房间仍在蓄压。" : "当前回合记忆已写入公开战局。",
    });

    if (round.eventCard) {
      feed.push({
        id: `event-${round.round}`,
        kind: "system",
        title: round.eventCard.title,
        text: `${round.eventCard.summary}\n\n目标：${round.eventCard.objective}\n风险：${round.eventCard.stakes}`,
      });
    }

    if (round.messages?.length) {
      pushMessages(round.messages);
    } else if (round.chapter) {
      splitText(round.chapter).forEach((text, index) => {
        feed.push({ id: `chapter-${round.round}-${index}`, kind: "system", title: "旁白", text });
      });
    } else {
      round.scores.forEach((score) => {
        score.notes.slice(0, 2).forEach((note, index) => {
          feed.push({ id: `${round.round}-${score.participantId}-${index}`, kind: "speaker", speakerId: score.participantId, text: note });
        });
      });
    }

    if (round.elimination) {
      feed.push({ id: `elim-${round.round}`, kind: "system", title: "淘汰播报", text: round.elimination });
    }
  });

  splitText(streamChunks.join("")).forEach((text, index) => {
    feed.push({ id: `live-${index}`, kind: "system", title: "实时流", text });
  });

  if (liveMessages.length) {
    pushMessages(liveMessages);
  }

  if (!feed.length) {
    feed.push({ id: "empty", kind: "system", title: "静默房间", text: "剧情尚未正式开始，下一回合触发后这里会开始灌入对话与旁白。" });
  }

  return feed;
}
