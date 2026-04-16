import axios from "axios";

import { env } from "../config/env";

const AI_SERVICE_URL = env.AI_SERVICE_URL;

export interface ResearchRequest {
  query: string;
  disease?: string;
  location?: string;
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface ResearchResponse {
  structured: {
    overview: string;
    insights: string;
    trialSummary: string;
  };
  publications: Array<{
    title: string;
    authors: string[];
    year?: number;
    source?: string;
    url?: string;
    abstract?: string;
    relevanceScore?: number;
    citationCount?: number;
  }>;
  clinicalTrials: Array<{
    title: string;
    status?: string;
    eligibility?: string;
    location?: string;
    contact?: string;
    url?: string;
  }>;
  expandedQueries: string[];
}

export async function callAIResearch(
  request: ResearchRequest,
): Promise<ResearchResponse> {
  const response = await axios.post<ResearchResponse>(
    `${AI_SERVICE_URL}/api/research`,
    request,
    {
      timeout: 120_000,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
}
