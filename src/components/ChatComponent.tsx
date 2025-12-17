"use client";

import React from "react";
import { useChat } from "ai/react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Send } from "lucide-react";
import MessageList from "./MessageList";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

type Props = { chatId: number };

const ChatComponent = ({ chatId }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const res = await axios.post("/api/get-messages", { chatId });
      return res.data;
    },
  });

  const { input, handleInputChange, handleSubmit, messages } = useChat({
    api: "/api/chat",
    body: { chatId },
    initialMessages: data ?? [],
  });

  return (
    <div>
      <MessageList messages={messages} isLoading={isLoading} />

      <form onSubmit={handleSubmit}>
        <Input value={input} onChange={handleInputChange} />
        <Button type="submit">
          <Send />
        </Button>
      </form>
    </div>
  );
};

export default ChatComponent;
