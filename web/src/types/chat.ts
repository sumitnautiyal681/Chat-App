export interface BaseUser {
  _id: string;
  name: string;
  profilePic?: string;
  updatedAt?: string;
  email: string;
}

// Single user chat
export interface Chat {
  _id: string;
  name: string;
  isGroupChat: false;
  users: BaseUser[];       // participants in the chat
  members?: never[];       // not used for single chat
  admin?: BaseUser;        // optional if you want an admin
  profilePic?: string;
  updatedAt?: string;
  admins?: BaseUser[];     // optional
}

// Group chat
export interface Group {
  _id: string;
  name: string;
  isGroupChat: boolean;
  members: BaseUser[];     // main group members
  users?: BaseUser[];      // optional, could duplicate members
  admin: BaseUser;         // group creator/admin
  admins?: BaseUser[];     // other admins
  profilePic?: string;
  updatedAt?: string;
   left?: boolean; 
}
