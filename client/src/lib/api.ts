import axios, { type AxiosResponse } from "axios";

import type { Conversation, Message, User } from "../types";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface CreateUserPayload {
  name?: string;
  diseaseOfInterest?: string;
  location?: string;
  identifier?: string;
}

export interface SendChatMessagePayload {
  userId: string;
  conversationId?: string;
  message: string;
  disease?: string;
  location?: string;
}

export interface ChatResponseData {
  conversationId: string;
  userMessage: Message;
  assistantMessage: Message;
}

const api = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const unwrap = <T>(response: AxiosResponse<ApiResponse<T>>): T =>
  response.data.data;

export const createUser = async (
  data: CreateUserPayload,
): Promise<User> => {
  const response = await api.post<ApiResponse<User>>("/users", data);
  return unwrap(response);
};

export const sendChatMessage = async (
  data: SendChatMessagePayload,
): Promise<ChatResponseData> => {
  const response = await api.post<ApiResponse<ChatResponseData>>(
    "/chat",
    data,
  );
  return unwrap(response);
};

export const getConversations = async (
  userId: string,
): Promise<Conversation[]> => {
  const response = await api.get<ApiResponse<Conversation[]>>(
    `/conversations/${userId}`,
  );
  return unwrap(response);
};

export const getMessages = async (
  conversationId: string,
): Promise<Message[]> => {
  const response = await api.get<ApiResponse<Message[]>>(
    `/conversations/${conversationId}/messages`,
  );
  return unwrap(response);
};

export const deleteConversation = async (
  conversationId: string,
): Promise<{
  conversationId: string;
  deletedMessageCount: number;
}> => {
  const response = await api.delete<
    ApiResponse<{
      conversationId: string;
      deletedMessageCount: number;
    }>
  >(`/conversations/${conversationId}`);

  return unwrap(response);
};

export { api };
