import mongoose, { Document, Schema, Model } from "mongoose";

export interface IGroup extends Document {
  name: string;
  admin: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  admins: mongoose.Types.ObjectId[];
  profilePic?: string | null;
  lastMessageAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const groupSchema: Schema<IGroup> = new Schema(
  {
    name: { type: String, required: true },
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    admins: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    profilePic: { type: String, default: null },
    lastMessageAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Group: Model<IGroup> = mongoose.model<IGroup>("Group", groupSchema);
export default Group;
