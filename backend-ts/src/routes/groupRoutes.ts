import express, { Router } from "express";
import {
  createGroup,
  getUserGroups,
  removeMember,
  toggleAdmin,
  addMembers,
  leaveGroup,
  updateGroup,
  getGroupById,
} from "../controllers/groupController";
import { protect } from "../middleware/authMiddleware";

const router: Router = express.Router();

router.post("/", protect, createGroup);
router.get("/user-groups", protect, getUserGroups);
router.get("/:groupId", protect, getGroupById);
router.patch("/:groupId/remove-member", protect, removeMember);
router.patch("/:groupId/toggle-admin", protect, toggleAdmin);
router.patch("/:groupId/add-members", protect, addMembers);
router.patch("/:groupId/leave", protect, leaveGroup);
router.patch("/:groupId", protect, updateGroup);

export default router;
