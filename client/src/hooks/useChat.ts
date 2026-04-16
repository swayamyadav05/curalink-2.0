import { useCallback, useEffect, useState } from "react";

import { getMessages, sendChatMessage } from "../lib/api";
import type { Message } from "../types";

interface UseChatOptions {
  userId: string | null;
  conversationId: string | null;
  onConversationChange: (conversationId: string) => void;
}

export interface SendMessageInput {
  message: string;
  disease?: string;
  location?: string;
}

export const useChat = ({
  userId,
  conversationId,
  onConversationChange,
}: UseChatOptions) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(
    async (nextConversationId: string) => {
      setIsLoadingMessages(true);
      setError(null);

      try {
        const history = await getMessages(nextConversationId);
        setMessages(history);
      } catch (loadError) {
        console.error("Unable to load messages", loadError);
        setMessages([]);
        setError("Unable to load conversation history right now.");
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    void loadMessages(conversationId);
  }, [conversationId, loadMessages]);

  const sendMessage = useCallback(
    async (input: SendMessageInput) => {
      if (!userId) {
        setError("User is not initialized yet.");
        return;
      }

      setIsSending(true);
      setError(null);

      try {
        const response = await sendChatMessage({
          userId,
          conversationId: conversationId ?? undefined,
          message: input.message,
          disease: input.disease,
          location: input.location,
        });

        if (response.conversationId !== conversationId) {
          onConversationChange(response.conversationId);
        }

        setMessages((currentMessages) => [
          ...currentMessages,
          response.userMessage,
          response.assistantMessage,
        ]);
      } catch (sendError) {
        console.error("Unable to send message", sendError);
        setError(
          "Unable to send message right now. Please try again.",
        );
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, onConversationChange, userId],
  );

  return {
    messages,
    isSending,
    isLoadingMessages,
    error,
    sendMessage,
  };
};
