import {
  HydratedDocument,
  Model,
  Schema,
  model,
  models,
} from "mongoose";

export interface IUser {
  name?: string;
  diseaseOfInterest?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser, Model<IUser>>(
  {
    name: {
      type: String,
      trim: true,
    },
    diseaseOfInterest: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
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

export const User =
  (models.User as Model<IUser>) || model<IUser>("User", userSchema);
