import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

interface ChatInputProps {
  isSending: boolean;
  value: string;
  focusSignal: number;
  onChange: (message: string) => void;
  onSend: (message: string) => Promise<void>;
}

export const ChatInput = ({
  isSending,
  value,
  focusSignal,
  onChange,
  onSend,
}: ChatInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const maxHeight = 24 * 6;

    textarea.style.height = "0px";

    const nextHeight = Math.min(
      Math.max(56, textarea.scrollHeight),
      maxHeight,
    );

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [resizeTextarea, value]);

  useEffect(() => {
    if (focusSignal === 0) {
      return;
    }

    textareaRef.current?.focus();
    resizeTextarea();
  }, [focusSignal, resizeTextarea]);

  const submitMessage = useCallback(async () => {
    const trimmedMessage = value.trim();

    if (!trimmedMessage || isSending) {
      return;
    }

    await onSend(trimmedMessage);
  }, [isSending, onSend, value]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitMessage();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void submitMessage();
  };

  return (
    <form
      className="rounded-xl border border-[#e5e7eb] bg-white p-3 transition-all duration-200 sm:p-4 dark:border-[#1f1f1f] dark:bg-[#0f0f0f]"
      onSubmit={handleSubmit}>
      <div className="flex items-end gap-3 pb-3 pr-3">
        <textarea
          className="w-full min-h-14 resize-none rounded-xl border border-[#e5e7eb] bg-white px-4 py-4 text-[15px] leading-6 text-[#111827] outline-none transition-all duration-200 placeholder:text-[#9ca3af] focus:border-[#bfdbfe] focus:ring-2 focus:ring-blue-500/20 dark:border-[#1f1f1f] dark:bg-[#141414] dark:text-[#f5f5f5] dark:placeholder:text-[#9ca3af] dark:focus:border-brand dark:focus:ring-blue-400/30"
          disabled={isSending}
          onBlur={() => setIsFocused(false)}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a medical research question..."
          ref={textareaRef}
          rows={1}
          value={value}
        />

        <button
          aria-label="Send message"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-md transition-all duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-500/40"
          disabled={isSending || value.trim().length === 0}
          type="submit">
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4 12L20 4L14 20L11.5 13.5L4 12Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      {isFocused ? (
        <p className="mt-2 text-xs text-[#6b7280] dark:text-[#9ca3af]">
          Press Enter to send, Shift+Enter for new line
        </p>
      ) : null}
    </form>
  );
};
