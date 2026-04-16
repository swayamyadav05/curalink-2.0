import {
  HydratedDocument,
  Model,
  Query,
  Schema,
  Types,
  model,
  models,
} from "mongoose";

export type MessageRole = "user" | "assistant";

export interface IMessageStructured {
  overview?: string;
  insights?: string;
  trialSummary?: string;
}

export interface IMessagePublication {
  title: string;
  authors: string[];
  year?: number;
  source?: string;
  url?: string;
  abstract?: string;
  relevanceScore?: number;
}

export interface IMessageClinicalTrial {
  title: string;
  status?: string;
  eligibility?: string;
  location?: string;
  contact?: string;
  url?: string;
}

export interface IMessage {
  conversationId: Types.ObjectId;
  role: MessageRole;
  content: string;
  structured?: IMessageStructured;
  publications: IMessagePublication[];
  clinicalTrials: IMessageClinicalTrial[];
  createdAt: Date;
  updatedAt: Date;
}

export type MessageDocument = HydratedDocument<IMessage>;

const messageStructuredSchema = new Schema<IMessageStructured>(
  {
    overview: {
      type: String,
      trim: true,
    },
    insights: {
      type: String,
      trim: true,
    },
    trialSummary: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const publicationSchema = new Schema<IMessagePublication>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    authors: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    year: {
      type: Number,
    },
    source: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
    },
    abstract: {
      type: String,
      trim: true,
    },
    relevanceScore: {
      type: Number,
    },
  },
  {
    _id: false,
  },
);

const clinicalTrialSchema = new Schema<IMessageClinicalTrial>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      trim: true,
    },
    eligibility: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    contact: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const messageSchema = new Schema<IMessage, Model<IMessage>>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    structured: {
      type: messageStructuredSchema,
    },
    publications: {
      type: [publicationSchema],
      default: [],
    },
    clinicalTrials: {
      type: [clinicalTrialSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
  },
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

messageSchema.pre(
  /^find/,
  function (this: Query<IMessage[], IMessage>, next) {
    const options = this.getOptions();

    if (!options.sort) {
      this.sort({ createdAt: 1 });
    }

    next();
  },
);

export const Message =
  (models.Message as Model<IMessage>) ||
  model<IMessage>("Message", messageSchema);
