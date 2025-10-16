import express, { Router } from "express";
import {
  registerUser,
  loginUser,
  getAllUsers,
  sendFriendRequest,
  acceptFriendRequest,
  getFriendRequests,
  getFriends,
  updateUserProfile,
} from "../controllers/userController";
import { protect } from "../middleware/authMiddleware";

const router: Router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/all", protect, getAllUsers);
router.get("/friends", protect, getFriends);
router.get("/friend-requests", protect, getFriendRequests);
router.post("/friend-request", protect, sendFriendRequest);
router.post("/accept-request", protect, acceptFriendRequest);
router.put("/:id", protect, updateUserProfile);

export default router;
