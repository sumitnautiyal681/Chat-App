import mongoose, { Document, Schema, Model } from "mongoose";

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  senderName?: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  type: string;
  delivered: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const messageSchema: Schema<IMessage> = new Schema(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: String,
    content: {
      type: String,
      required: true,
    },
    fileUrl: { type: String },
    fileName: { type: String },
    type: { type: String, default: "text" },
    delivered: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Message: Model<IMessage> = mongoose.model<IMessage>("Message", messageSchema);
export default Message;
