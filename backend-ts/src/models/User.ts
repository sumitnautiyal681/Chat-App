// src/models/User.ts

import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

// The interface describing the document
export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // Made optional to reflect it can be excluded from queries
  profilePic: string;
  friends: Types.ObjectId[];
  friendRequests: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

// The schema definition
const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false }, // `select: false` is good practice for passwords
    profilePic: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/847/847969.png",
    },
    friends: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    friendRequests: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
  },
  { timestamps: true }
);

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  // If password field wasn't selected, `this.password` will be undefined
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create and export the model
const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;