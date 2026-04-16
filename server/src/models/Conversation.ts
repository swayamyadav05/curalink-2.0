import {
  HydratedDocument,
  Model,
  Schema,
  Types,
  model,
  models,
} from "mongoose";

export interface IConversationContext {
  disease?: string;
  location?: string;
  topics: string[];
}

export interface IConversation {
  userId: Types.ObjectId;
  title: string;
  context: IConversationContext;
  createdAt: Date;
  updatedAt: Date;
}

export type ConversationDocument = HydratedDocument<IConversation>;

const conversationContextSchema = new Schema<IConversationContext>(
  {
    disease: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    topics: {
      type: [{ type: String, trim: true }],
      default: [],
    },
  },
  {
    _id: false,
  },
);

const conversationSchema = new Schema<
  IConversation,
  Model<IConversation>
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    context: {
      type: conversationContextSchema,
      default: (): IConversationContext => ({
        topics: [],
      }),
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

conversationSchema.index({ userId: 1, createdAt: -1 });

export const Conversation =
  (models.Conversation as Model<IConversation>) ||
  model<IConversation>("Conversation", conversationSchema);
