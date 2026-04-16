import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Brain,
  Microscope,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

import type { Message } from "../types";
import { CuraLinkMark } from "./CuraLinkMark";
import { MessageBubble } from "./MessageBubble";

interface ChatWindowProps {
  messages: Message[];
  isLoading?: boolean;
  isSending?: boolean;
  onSelectExample?: (query: string) => void;
}

const EXAMPLE_QUERIES = [
  {
    icon: Stethoscope,
    text: "Latest treatment for lung cancer",
  },
  {
    icon: Microscope,
    text: "Clinical trials for Parkinson's disease near me",
  },
  {
    icon: Brain,
    text: "Recent studies on Alzheimer's",
  },
  {
    icon: Activity,
    text: "Diabetes management research 2025",
  },
] as Array<{ icon: LucideIcon; text: string }>;

const LOADING_STEPS = [
  "Searching medical research...",
  "Analyzing results...",
  "Generating response...",
];

export const ChatWindow = ({
  messages,
  isLoading = false,
  isSending = false,
  onSelectExample,
}: ChatWindowProps) => {
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isSending, messages]);

  useEffect(() => {
    if (!isSending) {
      setLoadingStepIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setLoadingStepIndex(
        (currentValue) => (currentValue + 1) % LOADING_STEPS.length,
      );
    }, 3500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isSending]);

  const loadingText = useMemo(
    () => LOADING_STEPS[loadingStepIndex],
    [loadingStepIndex],
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white dark:border-[#1f1f1f] dark:bg-[#0f0f0f]">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="grid h-full place-items-center text-sm text-[#6b7280] dark:text-[#9ca3af]">
            Loading conversation...
          </div>
        ) : null}

        {!isLoading && messages.length === 0 && !isSending ? (
          <div className="h-full pt-24 sm:pt-28">
            <div className="w-full rounded-xl border border-[#e5e7eb] bg-white p-6 sm:p-8 dark:border-[#1f1f1f] dark:bg-[#0f0f0f]">
              <h2 className="text-2xl font-semibold leading-tight text-[#111827] dark:text-[#f5f5f5] sm:text-3xl">
                What medical research are you exploring today?
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-[#6b7280] dark:text-[#9ca3af] sm:text-base">
                Ask about diseases, treatments, or clinical trials -
                backed by PubMed, OpenAlex, and ClinicalTrials.gov.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {EXAMPLE_QUERIES.map((query) => {
                  const QueryIcon = query.icon;

                  return (
                    <button
                      className="inline-flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-left text-sm text-[#111827] transition-all duration-200 hover:border-[#bfdbfe] hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-[#1f1f1f] dark:bg-[#141414] dark:text-[#f5f5f5] dark:hover:border-[#2a2a2a] dark:hover:bg-[#1a1a1a] dark:focus:ring-blue-400/30"
                      key={query.text}
                      onClick={() => onSelectExample?.(query.text)}
                      type="button">
                      <QueryIcon
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-[#6b7280] dark:text-[#9ca3af]"
                      />
                      <span className="leading-snug">
                        {query.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {!isLoading && (messages.length > 0 || isSending) ? (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message._id} message={message} />
            ))}

            {isSending ? (
              <div className="flex items-start gap-3">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dbeafe] bg-blue-50 text-brand dark:border-[#1f1f1f] dark:bg-[#141414]">
                  <CuraLinkMark className="h-4 w-4" />
                </div>

                <div className="max-w-[90%] rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 dark:border-[#1f1f1f] dark:bg-[#141414]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-brand"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-brand"
                      style={{ animationDelay: "120ms" }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-brand"
                      style={{ animationDelay: "240ms" }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[#6b7280] dark:text-[#9ca3af]">
                    {loadingText}
                  </p>
                </div>
              </div>
            ) : null}

            <div ref={bottomAnchorRef} />
          </div>
        ) : null}
      </div>
    </section>
  );
};
