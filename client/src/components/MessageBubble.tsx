import type { Message } from "../types";
import { CuraLinkMark } from "./CuraLinkMark";

interface MessageBubbleProps {
  message: Message;
}

const formatMessageTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === "user";
  const timestamp = formatMessageTimestamp(message.createdAt);

  return (
    <div
      className={`flex items-start gap-3 ${
        isUser ? "justify-end" : "justify-start"
      }`}>
      {!isUser ? (
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dbeafe] bg-blue-50 text-brand dark:border-[#1f1f1f] dark:bg-[#141414]">
          <CuraLinkMark className="h-4 w-4" />
        </div>
      ) : null}

      <div
        className={`flex flex-col ${
          isUser ? "max-w-[80%] items-end" : "max-w-[90%] items-start"
        }`}>
        <div
          className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
            isUser
              ? "rounded-br-lg border border-[#dbeafe] bg-blue-50 text-[#111827] dark:border-[#1f1f1f] dark:bg-[#1e3a8a]/30 dark:text-[#f5f5f5]"
              : "rounded-bl-lg bg-transparent text-[#111827] dark:text-[#f5f5f5]"
          }`}>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {timestamp ? (
          <p className="mt-1 px-1 text-xs text-[#6b7280] dark:text-[#9ca3af]">
            {timestamp}
          </p>
        ) : null}
      </div>

      {isUser ? (
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e5e7eb] text-xs font-semibold text-[#111827] dark:bg-[#1f1f1f] dark:text-[#f5f5f5]">
          U
        </div>
      ) : null}
    </div>
  );
};
