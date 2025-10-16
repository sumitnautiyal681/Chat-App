import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";

interface JwtPayload {
  id: string;
}

// Extend Express Request to include `user`
export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error("JWT_SECRET is not defined");

      const decoded = jwt.verify(token, secret) as JwtPayload;
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return res.status(401).json({ message: "Not authorized" });

      req.user = user; // now TS knows user is IUser
      next();
    } catch (err) {
      res.status(401).json({ message: "Not authorized" });
    }
  } else {
    res.status(401).json({ message: "No token, not authorized" });
  }
};
