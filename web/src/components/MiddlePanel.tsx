// "use client";

// import Chats from "./Chats";
// import Friends from "./Friends";
// import CreateGroup from "./CreateGroup";
// import Profile from "./Profile";
// import React from "react";
// import { BaseUser, Chat, Group } from "../types/chat"; // ✅ shared types

// type Section = "chats" | "groups" | "friends" | "profile";

// interface MiddlePanelProps {
//   selectedSection: Section;
//   setSelectedChat: React.Dispatch<React.SetStateAction<Chat | Group | null>>;
//   newGroup: Group | null;
//   setNewGroup: React.Dispatch<React.SetStateAction<Group | null>>;
//   onGroupUpdated?: (updatedGroup: Group) => void;
  
// }

// const MiddlePanel: React.FC<MiddlePanelProps> = ({
//   selectedSection,
//   setSelectedChat,
//   newGroup,
//   setNewGroup,
//   onGroupUpdated,
// }) => {
//   switch (selectedSection) {
//     case "chats":
//       return (
//         <Chats
//           setSelectedChat={setSelectedChat}
//           newGroup={newGroup}
//           onGroupUpdated={onGroupUpdated}
//         />
//       );
//     case "friends":
//       return <Friends />;
//     case "groups":
//       return (
//   <CreateGroup
//     onGroupCreated={(group) =>
//       setNewGroup({
//         ...group,
//         isGroupChat:true,
//         members: group.members as unknown as BaseUser[],
//       })
//     }
//   />
// );

//     case "profile":
//       return <Profile />;
//     default:
//       return null;
//   }
// };

// export default MiddlePanel;
"use client";

import Chats from "./Chats";
import Friends from "./Friends";
import CreateGroup from "./CreateGroup";
import Profile from "./Profile";
import React from "react";
import { BaseUser, Chat, Group } from "../types/chat";

type Section = "chats" | "groups" | "friends" | "profile";

interface MiddlePanelProps {
  selectedSection: Section;
  setSelectedChat: React.Dispatch<React.SetStateAction<Chat | Group | null>>;
  newGroup: Group | null;
  setNewGroup: React.Dispatch<React.SetStateAction<Group | null>>;
  onGroupUpdated?: (updatedGroup: Group) => void;
}

const MiddlePanel: React.FC<MiddlePanelProps> = ({
  selectedSection,
  setSelectedChat,
  newGroup,
  setNewGroup,
  onGroupUpdated,
}) => {
  switch (selectedSection) {
    case "chats":
      return (
        <Chats
          setSelectedChat={setSelectedChat}
          newGroup={newGroup}
          onGroupUpdated={onGroupUpdated}
        />
      );
    case "friends":
      return <Friends />;
    case "groups":
      return (
        <CreateGroup
          onGroupCreated={(group) =>
            setNewGroup({
              ...group,
              isGroupChat: true,
              members: group.members as unknown as BaseUser[],
            })
          }
        />
      );
    case "profile":
      return <Profile />;
    default:
      return null;
  }
};

export default MiddlePanel;
