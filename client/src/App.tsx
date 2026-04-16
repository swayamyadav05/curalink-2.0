import { useCallback, useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
import axios from "axios";

import { ChatInput } from "./components/ChatInput";
import { ChatWindow } from "./components/ChatWindow";
import { Header } from "./components/Header";
import { useTheme } from "./context/theme-context";
import {
  createUser,
  getConversations,
  type CreateUserPayload,
} from "./lib/api";
import { useChat } from "./hooks/useChat";
import type { Conversation } from "./types";

const USER_ID_STORAGE_KEY = "curalink:userId";
const CONVERSATION_ID_STORAGE_KEY = "curalink:conversationId";
const DISEASE_STORAGE_KEY = "curalink:context:disease";
const LOCATION_STORAGE_KEY = "curalink:context:location";

const formatConversationTime = (updatedAt: string): string => {
  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return "Updated recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
};

function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(
    null,
  );
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>(
    [],
  );
  const [isLoadingConversations, setIsLoadingConversations] =
    useState(false);
  const [sidebarError, setSidebarError] = useState<string | null>(
    null,
  );
  const [contextDisease, setContextDisease] = useState("");
  const [contextLocation, setContextLocation] = useState("");
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [contextDraftDisease, setContextDraftDisease] = useState("");
  const [contextDraftLocation, setContextDraftLocation] =
    useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [focusComposerSignal, setFocusComposerSignal] = useState(0);
  const { theme, toggleTheme } = useTheme();

  const refreshConversations = useCallback(
    async (targetUserId: string): Promise<Conversation[]> => {
      setIsLoadingConversations(true);

      try {
        const nextConversationsResponse =
          await getConversations(targetUserId);
        const nextConversations = Array.isArray(
          nextConversationsResponse,
        )
          ? nextConversationsResponse
          : [];

        setConversations(nextConversations);
        setSidebarError(null);
        return nextConversations;
      } catch (loadError) {
        console.error("Unable to load conversations", loadError);

        if (
          axios.isAxiosError(loadError) &&
          loadError.response?.status === 404
        ) {
          setConversations([]);
          setSidebarError(null);
          return [];
        }

        setConversations([]);
        setSidebarError("Couldn't load conversations");
        return [];
      } finally {
        setIsLoadingConversations(false);
      }
    },
    [],
  );

  const handleConversationChange = useCallback(
    (nextConversationId: string) => {
      setConversationId(nextConversationId);
      localStorage.setItem(
        CONVERSATION_ID_STORAGE_KEY,
        nextConversationId,
      );
    },
    [],
  );

  const {
    error,
    isLoadingMessages,
    isSending,
    messages,
    sendMessage,
  } = useChat({
    userId,
    conversationId,
    onConversationChange: handleConversationChange,
  });

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation._id === conversationId,
      ) ?? null,
    [conversationId, conversations],
  );

  useEffect(() => {
    let isActive = true;

    const initializeChat = async () => {
      try {
        const storedDisease =
          localStorage.getItem(DISEASE_STORAGE_KEY) ?? "";
        const storedLocation =
          localStorage.getItem(LOCATION_STORAGE_KEY) ?? "";

        if (isActive) {
          setContextDisease(storedDisease);
          setContextLocation(storedLocation);
          setContextDraftDisease(storedDisease);
          setContextDraftLocation(storedLocation);
        }

        let resolvedUserId = localStorage.getItem(
          USER_ID_STORAGE_KEY,
        );

        if (!resolvedUserId) {
          const fallbackUserPayload: CreateUserPayload = {
            name: "CuraLink User",
          };

          const createdUser = await createUser(fallbackUserPayload);
          resolvedUserId = createdUser._id;
          localStorage.setItem(USER_ID_STORAGE_KEY, createdUser._id);
        }

        if (!resolvedUserId || !isActive) {
          return;
        }

        setUserId(resolvedUserId);

        const existingConversations =
          await refreshConversations(resolvedUserId);

        let resolvedConversationId = localStorage.getItem(
          CONVERSATION_ID_STORAGE_KEY,
        );

        if (
          resolvedConversationId &&
          !existingConversations.some(
            (conversation) =>
              conversation._id === resolvedConversationId,
          )
        ) {
          resolvedConversationId = null;
          localStorage.removeItem(CONVERSATION_ID_STORAGE_KEY);
        }

        if (
          !resolvedConversationId &&
          existingConversations.length > 0
        ) {
          resolvedConversationId = existingConversations[0]._id;
          localStorage.setItem(
            CONVERSATION_ID_STORAGE_KEY,
            resolvedConversationId,
          );
        }

        const matchedConversation = existingConversations.find(
          (conversation) =>
            conversation._id === resolvedConversationId,
        );

        const fallbackDisease =
          matchedConversation?.context.disease?.trim() ?? "";
        const fallbackLocation =
          matchedConversation?.context.location?.trim() ?? "";

        if (isActive) {
          const nextDisease = storedDisease || fallbackDisease;
          const nextLocation = storedLocation || fallbackLocation;

          setContextDisease(nextDisease);
          setContextLocation(nextLocation);
          setContextDraftDisease(nextDisease);
          setContextDraftLocation(nextLocation);
          setConversationId(resolvedConversationId ?? null);
        }
      } catch (initError) {
        console.error(
          "Unable to initialize CuraLink chat",
          initError,
        );
        setSidebarError("Couldn't load conversations");
      } finally {
        if (isActive) {
          setIsInitializing(false);
        }
      }
    };

    void initializeChat();

    return () => {
      isActive = false;
    };
  }, [refreshConversations]);

  useEffect(() => {
    const trimmedDisease = contextDisease.trim();

    if (trimmedDisease.length === 0) {
      localStorage.removeItem(DISEASE_STORAGE_KEY);
      return;
    }

    localStorage.setItem(DISEASE_STORAGE_KEY, trimmedDisease);
  }, [contextDisease]);

  useEffect(() => {
    const trimmedLocation = contextLocation.trim();

    if (trimmedLocation.length === 0) {
      localStorage.removeItem(LOCATION_STORAGE_KEY);
      return;
    }

    localStorage.setItem(LOCATION_STORAGE_KEY, trimmedLocation);
  }, [contextLocation]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      await sendMessage({
        message,
        disease: contextDisease.trim() || undefined,
        location: contextLocation.trim() || undefined,
      });

      setDraftMessage("");

      if (userId) {
        void refreshConversations(userId);
      }
    },
    [
      contextDisease,
      contextLocation,
      refreshConversations,
      sendMessage,
      userId,
    ],
  );

  const handleExampleSelect = useCallback((exampleQuery: string) => {
    setDraftMessage(exampleQuery);
    setFocusComposerSignal((currentValue) => currentValue + 1);
  }, []);

  const handleNewChat = useCallback(() => {
    setConversationId(null);
    localStorage.removeItem(CONVERSATION_ID_STORAGE_KEY);
    setDraftMessage("");
    setIsSidebarOpen(false);
    setFocusComposerSignal((currentValue) => currentValue + 1);
  }, []);

  const handleConversationSelect = useCallback(
    (conversation: Conversation) => {
      handleConversationChange(conversation._id);
      setContextDisease(conversation.context.disease ?? "");
      setContextLocation(conversation.context.location ?? "");
      setContextDraftDisease(conversation.context.disease ?? "");
      setContextDraftLocation(conversation.context.location ?? "");
      setIsEditingContext(false);
      setIsSidebarOpen(false);
    },
    [handleConversationChange],
  );

  const handleStartContextEdit = useCallback(() => {
    setContextDraftDisease(contextDisease);
    setContextDraftLocation(contextLocation);
    setIsEditingContext(true);
  }, [contextDisease, contextLocation]);

  const handleCancelContextEdit = useCallback(() => {
    setContextDraftDisease(contextDisease);
    setContextDraftLocation(contextLocation);
    setIsEditingContext(false);
  }, [contextDisease, contextLocation]);

  const handleSaveContext = useCallback(() => {
    setContextDisease(contextDraftDisease.trim());
    setContextLocation(contextDraftLocation.trim());
    setIsEditingContext(false);
  }, [contextDraftDisease, contextDraftLocation]);

  const contextPills = useMemo(
    () => [
      {
        key: "disease",
        label: "Disease",
        value: contextDisease,
      },
      {
        key: "location",
        label: "Location",
        value: contextLocation,
      },
    ],
    [contextDisease, contextLocation],
  );

  const isChatBusy = isInitializing || isSending;

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111827] dark:bg-[#0a0a0a] dark:text-[#f5f5f5]">
      {isSidebarOpen ? (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/25 transition-all duration-200 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        />
      ) : null}

      <div className="mx-auto flex min-h-screen w-full">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-70 flex-col border-r border-[#e5e7eb] bg-white px-4 py-4 transition-all duration-200 dark:border-[#1f1f1f] dark:bg-[#111111] lg:static lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}>
          <Header />

          <button
            className="mt-6 inline-flex items-center justify-center rounded-lg border border-[#dbeafe] bg-blue-50 px-3 py-2 text-sm font-medium text-brand transition-all duration-200 hover:border-[#bfdbfe] hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-[#1f1f1f] dark:bg-[#141414] dark:text-[#f5f5f5] dark:hover:bg-[#1a1a1a]"
            onClick={handleNewChat}
            type="button">
            + New Chat
          </button>

          <div className="mt-5 space-y-4">
            <section className="min-h-0">
              <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280] dark:text-[#9ca3af]">
                Conversations
              </p>

              <div className="mt-3 max-h-[44vh] space-y-2 overflow-y-auto pr-1 lg:max-h-[50vh]">
                {isLoadingConversations ? (
                  <div className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-3 text-sm text-[#6b7280] dark:border-[#1f1f1f] dark:bg-[#141414] dark:text-[#9ca3af]">
                    Loading conversations...
                  </div>
                ) : null}

                {!isLoadingConversations &&
                conversations.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#e5e7eb] bg-[#fafafa] p-3 text-sm text-[#6b7280] dark:border-[#1f1f1f] dark:bg-[#141414] dark:text-[#9ca3af]">
                    No conversations yet
                  </div>
                ) : null}

                {!isLoadingConversations
                  ? conversations.map((conversation) => {
                      const isActive =
                        conversation._id === conversationId;

                      return (
                        <button
                          className={`w-full rounded-xl border px-3 py-2 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/30 ${
                            isActive
                              ? "border-[#bfdbfe] bg-blue-50 dark:border-[#1f3f85] dark:bg-[#1e3a8a]/20"
                              : "border-[#e5e7eb] bg-white hover:border-[#bfdbfe] hover:bg-blue-50/40 dark:border-[#1f1f1f] dark:bg-[#141414] dark:hover:border-[#2a2a2a] dark:hover:bg-[#1a1a1a]"
                          }`}
                          key={conversation._id}
                          onClick={() =>
                            handleConversationSelect(conversation)
                          }
                          type="button">
                          <p className="truncate text-sm font-medium text-[#111827] dark:text-[#f5f5f5]">
                            {conversation.title}
                          </p>
                          <p className="mt-1 text-xs text-[#6b7280] dark:text-[#9ca3af]">
                            {formatConversationTime(
                              conversation.updatedAt,
                            )}
                          </p>
                        </button>
                      );
                    })
                  : null}
              </div>

              {sidebarError ? (
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  {sidebarError}
                </p>
              ) : null}
            </section>

            <div className="flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 dark:border-[#1f1f1f] dark:bg-[#141414]">
              <p className="text-xs font-medium text-[#6b7280] dark:text-[#9ca3af]">
                Theme
              </p>

              <button
                className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-[#6b7280] transition-all duration-200 hover:bg-[#fafafa] hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-[#9ca3af] dark:hover:bg-[#1a1a1a] dark:hover:text-[#f5f5f5] dark:focus:ring-blue-400/30"
                onClick={toggleTheme}
                type="button">
                {theme === "light" ? (
                  <Moon className="h-4 w-4 transition-transform duration-200" />
                ) : (
                  <Sun className="h-4 w-4 transition-transform duration-200" />
                )}
                <span>{theme === "light" ? "Dark" : "Light"}</span>
              </button>
            </div>

            <section className="rounded-xl border border-[#e5e7eb] bg-white p-3 dark:border-[#1f1f1f] dark:bg-[#111111]">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280] dark:text-[#9ca3af]">
                  Context
                </p>

                {!isEditingContext ? (
                  <button
                    className="rounded-lg px-2 py-1 text-xs text-brand transition-all duration-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:hover:bg-[#1a1a1a] dark:focus:ring-blue-400/30"
                    onClick={handleStartContextEdit}
                    type="button">
                    Edit
                  </button>
                ) : null}
              </div>

              {!isEditingContext ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {contextPills.map((pill) => (
                    <span
                      className={`inline-flex max-w-full items-center truncate rounded-full border px-2.5 py-1 text-xs ${
                        pill.value
                          ? "border-[#bfdbfe] bg-blue-50 text-brand dark:border-[#1f3f85] dark:bg-[#1e3a8a]/20 dark:text-[#bfdbfe]"
                          : "border-[#e5e7eb] bg-[#fafafa] text-[#6b7280] dark:border-[#1f1f1f] dark:bg-[#141414] dark:text-[#9ca3af]"
                      }`}
                      key={pill.key}>
                      {pill.label}: {pill.value || "Not set"}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <input
                    className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none transition-all duration-200 focus:border-[#bfdbfe] focus:ring-2 focus:ring-blue-500/20 dark:border-[#1f1f1f] dark:bg-[#141414] dark:text-[#f5f5f5] dark:focus:border-brand dark:focus:ring-blue-400/30"
                    onChange={(event) =>
                      setContextDraftDisease(event.target.value)
                    }
                    placeholder="Disease"
                    value={contextDraftDisease}
                  />

                  <input
                    className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none transition-all duration-200 focus:border-[#bfdbfe] focus:ring-2 focus:ring-blue-500/20 dark:border-[#1f1f1f] dark:bg-[#141414] dark:text-[#f5f5f5] dark:focus:border-brand dark:focus:ring-blue-400/30"
                    onChange={(event) =>
                      setContextDraftLocation(event.target.value)
                    }
                    placeholder="Location"
                    value={contextDraftLocation}
                  />

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/30"
                      onClick={handleSaveContext}
                      type="button">
                      Save
                    </button>

                    <button
                      className="rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-xs text-[#6b7280] transition-all duration-200 hover:bg-[#fafafa] focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-[#1f1f1f] dark:text-[#9ca3af] dark:hover:bg-[#1a1a1a] dark:focus:ring-blue-400/30"
                      onClick={handleCancelContextEdit}
                      type="button">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {activeConversation ? (
                <p className="mt-3 text-xs text-[#6b7280] dark:text-[#9ca3af]">
                  Active: {activeConversation.title}
                </p>
              ) : null}
            </section>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <div className="sticky top-0 z-20 border-b border-[#e5e7eb] bg-[#fafafa]/95 px-4 py-3 backdrop-blur dark:border-[#1f1f1f] dark:bg-[#0a0a0a]/95 lg:hidden">
            <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
              <button
                aria-label="Open sidebar"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white text-[#111827] transition-all duration-200 hover:bg-[#fafafa] focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-[#1f1f1f] dark:bg-[#111111] dark:text-[#f5f5f5] dark:hover:bg-[#1a1a1a] dark:focus:ring-blue-400/30"
                onClick={() => setIsSidebarOpen(true)}
                type="button">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.75"
                  />
                </svg>
              </button>

              <Header compact />
            </div>
          </div>

          <main className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4 sm:px-6 sm:pb-6 lg:pt-6">
            <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-4">
              <ChatWindow
                isLoading={isInitializing || isLoadingMessages}
                isSending={isSending}
                messages={messages}
                onSelectExample={handleExampleSelect}
              />

              {error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </p>
              ) : null}

              <ChatInput
                focusSignal={focusComposerSignal}
                isSending={isChatBusy}
                onChange={setDraftMessage}
                onSend={handleSendMessage}
                value={draftMessage}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
