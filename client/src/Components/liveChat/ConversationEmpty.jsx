import React from "react";
import { FaHeadset } from "react-icons/fa";

const ConversationEmpty = () => (
  <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center text-white/70">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
      <FaHeadset className="text-3xl" />
    </div>
    <h3 className="text-lg font-black text-white">Start a conversation</h3>
    <p className="mt-2 text-sm leading-relaxed">
      Start a conversation with our support team. We are here to help.
    </p>
  </div>
);

export default React.memo(ConversationEmpty);
