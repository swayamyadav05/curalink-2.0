import {
  connectToDatabase,
  disconnectFromDatabase,
} from "../config/db";
import { Conversation, Message, User } from "../models";

const runModelSmokeTest = async (): Promise<void> => {
  await connectToDatabase();

  const user = await User.create({
    name: "Model Smoke Test User",
    diseaseOfInterest: "Parkinson's disease",
    location: "Toronto, Canada",
  });

  const conversation = await Conversation.create({
    userId: user._id,
    title: "Latest treatment options for Parkinson's disease",
    context: {
      disease: user.diseaseOfInterest,
      location: user.location,
      topics: ["treatment options"],
    },
  });

  await Message.create({
    conversationId: conversation._id,
    role: "user",
    content: "What are the latest treatment options?",
  });

  await Message.create({
    conversationId: conversation._id,
    role: "assistant",
    content:
      "Here are recent directions in treatment research, including medication optimization and trial-backed interventions.",
    structured: {
      overview:
        "Recent treatment research focuses on symptom control, quality of life, and slowing functional decline.",
      insights:
        "Studies suggest combinations of medication timing and adjunct therapies can improve outcomes.",
      trialSummary:
        "Several active trials are evaluating novel compounds and personalized treatment protocols.",
    },
    publications: [
      {
        title:
          "Adjunct therapies and outcomes in Parkinson's disease management",
        authors: ["A. Smith", "R. Lee"],
        year: 2025,
        source: "PubMed",
        url: "https://pubmed.ncbi.nlm.nih.gov/00000000/",
        abstract:
          "A review of adjunct treatment strategies and patient-centered outcomes in Parkinson's disease.",
        relevanceScore: 0.91,
      },
    ],
    clinicalTrials: [
      {
        title: "Novel Neuroprotective Agent in Parkinson's Disease",
        status: "Recruiting",
        eligibility:
          "Adults aged 40-80 with diagnosed Parkinson's disease",
        location: "Toronto, Canada",
        contact: "research@hospital.example",
        url: "https://clinicaltrials.gov/study/NCT00000000",
      },
    ],
  });

  const messages = await Message.find({
    conversationId: conversation._id,
  });

  console.log(
    JSON.stringify(
      {
        user,
        conversation,
        messages,
      },
      null,
      2,
    ),
  );
};

const main = async (): Promise<void> => {
  try {
    await runModelSmokeTest();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error(`Model smoke test failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await disconnectFromDatabase();
  }
};

void main();
