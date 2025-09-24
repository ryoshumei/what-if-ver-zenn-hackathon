"use client";

import { memo } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  generationId?: string;
  type?: "image" | "video";
  isStreaming?: boolean;
}

interface GenerationStatus {
  id: string;
  status: "queued" | "running" | "complete" | "failed";
  type: "image" | "video";
  prompt: string;
  assetUrl?: string;
  error?: string;
}

interface ChatMessageProps {
  message: ChatMessage;
  generation?: GenerationStatus | null;
}

const ChatMessage = memo(function ChatMessage({
  message,
  generation: _generation,
}: ChatMessageProps) {
  return (
    <div
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-3xl rounded-lg px-4 py-3 ${
          message.role === "user"
            ? "bg-blue-700 text-white"
            : "bg-white border border-gray-300"
        }`}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {message.role === "user" ? (
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                U
              </div>
            ) : (
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                🤖
              </div>
            )}
          </div>
          <div className="flex-1">
            <p
              className={
                message.role === "user" ? "text-white" : "text-gray-900"
              }
            >
              {message.content}
              {message.isStreaming && (
                <span className="inline-block w-1 h-4 ml-1 bg-blue-700 animate-pulse"></span>
              )}
            </p>

            <div className="text-xs text-gray-600 mt-2">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ChatMessage;
