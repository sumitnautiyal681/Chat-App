import { Request, Response } from "express";
import Group, { IGroup } from "../models/Group";
import User, { IUser } from "../models/User";
import mongoose from "mongoose";

interface AuthRequest extends Request {
  user?: { _id: mongoose.Types.ObjectId };
}

// Create a new group
export const createGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { name, members, profilePic } = req.body as { name: string; members: string[]; profilePic?: string };
    const adminId = req.user?._id;

    if (!name || !members || members.length === 0 || !adminId) {
      return res.status(400).json({ message: "Name and members required" });
    }

    if (!members.includes(adminId.toString())) members.push(adminId.toString());

    const group = await Group.create({ name, admin: adminId, members, profilePic: profilePic || null });

    await group.populate("admin", "name profilePic _id");
    await group.populate("members", "name profilePic _id");
    await group.populate("admins", "name profilePic _id");

    res.status(201).json(group);
  } catch (err) {
    console.error("Error creating group:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all groups the user is part of
export const getUserGroups = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const groups = await Group.find({ members: userId })
      .populate("admin", "name email")
      .populate("members", "name email")
      .populate("admins", "name email");

    res.json(groups);
  } catch (err) {
    console.error("Error fetching groups:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Toggle admin
export const toggleAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const { memberId } = req.body;
    const userId = req.user?._id.toString();
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.admin.toString() !== userId) return res.status(403).json({ message: "Only creator can manage admins" });
    if (memberId === group.admin.toString()) return res.status(400).json({ message: "Cannot remove creator from admin" });
    if (!group.members.map(m => m.toString()).includes(memberId)) return res.status(404).json({ message: "Member not in group" });

    const isAdmin = (group.admins || []).map(a => a.toString()).includes(memberId);
    const update = isAdmin ? { $pull: { admins: memberId } } : { $addToSet: { admins: memberId } };

    await Group.findByIdAndUpdate(groupId, update, { new: true });

    const populatedGroup = await Group.findById(groupId)
      .populate("admin", "name email profilePic _id")
      .populate("members", "name email profilePic _id")
      .populate("admins", "name email profilePic _id");

    const io = req.app.get('io');
    if (io && populatedGroup) {
      io.to(groupId.toString()).emit("group_updated", populatedGroup);
      populatedGroup.members.forEach(m => io.to(m._id.toString()).emit("group_updated", populatedGroup));
      io.to(userId).emit("group_updated", populatedGroup);
    }

    res.json(populatedGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove member
export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const { memberId } = req.body;
    const userId = req.user?._id.toString();
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.admin.toString() !== userId) return res.status(403).json({ message: "Only creator can remove members" });
    if (memberId === group.admin.toString()) return res.status(400).json({ message: "Cannot remove creator" });

    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $pull: { members: memberId, admins: memberId } },
      { new: true }
    ).populate([
      { path: "admin", select: "name profilePic _id" },
      { path: "members", select: "name profilePic _id" },
      { path: "admins", select: "name profilePic _id" },
    ]);

    const io = req.app.get("io");
    if (io && updatedGroup) {
      io.to(groupId.toString()).emit("group_updated", updatedGroup);
      updatedGroup.members.forEach(m => io.to(m._id.toString()).emit("group_updated", updatedGroup));
      io.to(userId).emit("group_updated", updatedGroup);
    }

    res.json(updatedGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Add members
export const addMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const { memberIds } = req.body;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.admin.toString() !== userId.toString() && !group.admins.map(a => a.toString()).includes(userId.toString())) {
      return res.status(403).json({ message: "Only admins can add members" });
    }

    const objectIds: mongoose.Types.ObjectId[] = memberIds.map((id: string) => new mongoose.Types.ObjectId(id));

    group.members = [...new Set([...group.members, ...objectIds])];
    await group.save();

    const populatedGroup = await Group.findById(groupId)
      .populate("admin", "name email profilePic")
      .populate("members", "name email profilePic")
      .populate("admins", "name email profilePic");

    const io = req.app.get("io");
    if (io && populatedGroup) {
      io.to(groupId.toString()).emit("group_updated", populatedGroup);
      populatedGroup.members.forEach(m => io.to(m._id.toString()).emit("group_updated", populatedGroup));
      io.to(userId.toString()).emit("group_updated", populatedGroup);
    }

    res.json(populatedGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Leave group
export const leaveGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    group.members = group.members.filter(m => m.toString() !== userId.toString());
    group.admins = group.admins.filter(a => a.toString() !== userId.toString());

    if (group.admin._id.toString() === userId.toString() && group.members.length > 0) {
      group.admin = group.members[0];
    }

    await group.save();
    res.status(200).json({ message: "Left group successfully", group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update group
export const updateGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const { name, profilePic } = req.body as { name?: string; profilePic?: string };
    const userId = req.user?._id.toString();
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.admin.toString() !== userId) return res.status(403).json({ message: "Only creator can edit group" });

    if (name) group.name = name;
    if (profilePic) group.profilePic = profilePic;
    await group.save();

    const populatedGroup = await Group.findById(groupId)
      .populate("admin", "name email profilePic _id")
      .populate("members", "name email profilePic _id")
      .populate("admins", "name email profilePic _id");

    const io = req.app.get("io");
    if (io && populatedGroup) {
      io.to(groupId.toString()).emit("group_updated", populatedGroup);
      populatedGroup.members.forEach(m => io.to(m._id.toString()).emit("group_updated", populatedGroup));
      io.to(userId).emit("group_updated", populatedGroup);
    }

    res.json(populatedGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get group by ID
export const getGroupById = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId)
      .populate("admin", "name email profilePic _id")
      .populate("members", "name email profilePic _id updatedAt")
      .populate("admins", "name email profilePic _id updatedAt");

    if (!group) return res.status(404).json({ message: "Group not found" });

    res.json(group);
  } catch (err) {
    console.error("Error fetching group:", err);
    res.status(500).json({ message: "Server error" });
  }
};
