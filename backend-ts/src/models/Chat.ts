import mongoose, { Document, Schema, Model } from "mongoose";

export interface IChat extends Document {
  users: mongoose.Types.ObjectId[];
  name?: string;
  latestMessage?: mongoose.Types.ObjectId;
  isGroupChat: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const chatSchema: Schema<IChat> = new Schema(
  {
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    name: { type: String }, // optional, for groups or display
    latestMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    isGroupChat: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Chat: Model<IChat> = mongoose.model<IChat>("Chat", chatSchema);

export default Chat;
