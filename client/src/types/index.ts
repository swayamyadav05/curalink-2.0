export type MessageRole = "user" | "assistant";

export interface User {
  _id: string;
  name?: string;
  diseaseOfInterest?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationContext {
  disease?: string;
  location?: string;
  topics: string[];
}

export interface Conversation {
  _id: string;
  userId: string;
  title: string;
  context: ConversationContext;
  createdAt: string;
  updatedAt: string;
}

export interface StructuredResponse {
  overview?: string;
  insights?: string;
  trialSummary?: string;
}

export interface Publication {
  title: string;
  authors: string[];
  year?: number;
  source?: string;
  url?: string;
  abstract?: string;
  relevanceScore?: number;
}

export interface ClinicalTrial {
  title: string;
  status?: string;
  eligibility?: string;
  location?: string;
  contact?: string;
  url?: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  structured?: StructuredResponse;
  publications: Publication[];
  clinicalTrials: ClinicalTrial[];
  createdAt: string;
  updatedAt: string;
}
