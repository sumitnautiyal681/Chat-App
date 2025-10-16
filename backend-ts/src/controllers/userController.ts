// src/controllers/userController.ts

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import User, { IUser } from '../models/User.js'; // Assuming IUser is exported from your User model
import cloudinary from '../config/cloudinary.js';

// Define a custom request type for authenticated routes
interface AuthRequest extends Request {
  user?: { // `user` is added by your auth middleware
    _id: Types.ObjectId;
  };
}

/**
 * Generates a JWT token.
 * @param id - The user's MongoDB ObjectId.
 * @returns A signed JWT token.
 */
const generateToken = (id: Types.ObjectId): string => {
  // Use type assertion `as string` because `jsonwebtoken` expects a string secret
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/users/register
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, profilePic } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    let uploadedPicUrl: string | null = null;
    if (profilePic && typeof profilePic === 'string' && profilePic.startsWith('data:image')) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic, {
        folder: 'profilePics',
      });
      uploadedPicUrl = uploadResponse.secure_url;
    }
    
    const user = await User.create({
      name,
      email,
      password,
      profilePic: uploadedPicUrl || 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
        token: generateToken(user._id as unknown as Types.ObjectId),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/users/login
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email })
      .populate('friends', '_id name email profilePic')
      .populate('friendRequests', '_id name email profilePic');

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
        friends: user.friends.map((f: any) => f._id.toString()),
        friendRequests: user.friendRequests.map((f: any) => f._id.toString()),
        token: generateToken(user._id as unknown as Types.ObjectId),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
};

// @desc    Get all users except the logged-in user
// @route   GET /api/users/all
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const users = await User.find({ _id: { $ne: req.user._id } }).select('name email profilePic');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : 'An unknown error occurred' });
  }
};

// @desc    Send a friend request
// @route   POST /api/users/friend-request
export const sendFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const { toUserId } = req.body as { toUserId: string };
  
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const toUser = await User.findById(toUserId);
    if (!toUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const requesterId = req.user._id;

    if (toUser.friendRequests.includes(requesterId) || toUser.friends.includes(requesterId)) {
      res.status(400).json({ message: 'Request already sent or you are already friends' });
      return;
    }

    toUser.friendRequests.push(requesterId);
    await toUser.save();
    res.json({ message: 'Friend request sent' });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : 'An unknown error occurred' });
  }
};

// @desc    Accept a friend request
// @route   POST /api/users/accept-request
export const acceptFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const { fromUserId } = req.body as { fromUserId: string };

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = await User.findById(req.user._id);
    const fromUser = await User.findById(fromUserId);

    if (!currentUser || !fromUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    currentUser.friendRequests = currentUser.friendRequests.filter(
      (id) => id.toString() !== fromUserId
    );

    const fromUserIdObj = new Types.ObjectId(fromUserId);
    if (!currentUser.friends.some(friendId => friendId.equals(fromUserIdObj))) {
      currentUser.friends.push(fromUserIdObj);
    }
    if (!fromUser.friends.some(friendId => friendId.equals(currentUser._id as unknown as Types.ObjectId))) {
      fromUser.friends.push(currentUser._id as unknown as Types.ObjectId);
    }

    await currentUser.save();
    await fromUser.save();

    res.json({ message: 'Friend request accepted', user: currentUser });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : 'An unknown error occurred' });
  }
};

// @desc    Get all friend requests for the current user
// @route   GET /api/users/friend-requests
export const getFriendRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const user = await User.findById(req.user._id).populate('friendRequests', 'name profilePic');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.status(200).json(user.friendRequests);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch friend requests' });
  }
};

// @desc    Get all friends for the current user
// @route   GET /api/users/friends
export const getFriends = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const user = await User.findById(req.user._id).populate('friends', 'name profilePic');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user.friends);
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : 'An unknown error occurred' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/:id
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.profilePic = req.body.profilePic || user.profilePic;

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      profilePic: updatedUser.profilePic,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};