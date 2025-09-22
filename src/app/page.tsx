"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatMessage from "./components/chat/ChatMessage";
import GenerationResult from "./components/chat/GenerationResult";
import PromptInput from "./components/chat/PromptInput";

interface ChatMessageData {
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
  asset?: {
    id: string;
    url: string;
    storagePath: string;
    format: string;
    width?: number | null;
    height?: number | null;
    durationSec?: number | null;
    altText?: string | null;
    captions?: string | null;
    visibility: "private" | "public";
  };
  error?: string;
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [generations, setGenerations] = useState<GenerationStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const handleSubmit = useCallback(
    async (prompt: string, type: "image" | "video") => {
      if (!prompt.trim() || isLoading) return;

      setIsLoading(true);

      // Add user message
      const userMessage: ChatMessageData = {
        id: `user-${Date.now()}`,
        role: "user",
        content: prompt,
        timestamp: new Date(),
        type,
      };
      setMessages((prev) => [...prev, userMessage]);

      // Start with streaming chat response
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: ChatMessageData = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      try {
        // Stream chat response first
        const streamResponse = await fetch("/api/vertex/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: `The user wants to generate a ${type} with this prompt: "${prompt}". Provide a helpful, encouraging response about what you'll create, and explain the generation process briefly.`,
          }),
        });

        if (streamResponse.ok && streamResponse.body) {
          const reader = streamResponse.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n").filter((line) => line.trim());

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") break;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: msg.content + parsed.content }
                          : msg,
                      ),
                    );
                  }
                } catch (_e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        }

        // Mark streaming as complete
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, isStreaming: false }
              : msg,
          ),
        );

        // Now start the actual generation
        const generateResponse = await fetch("/api/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            type,
          }),
        });

        if (!generateResponse.ok) {
          throw new Error("Failed to start generation");
        }

        const { generationId } = await generateResponse.json();

        // Add generation status
        const newGeneration: GenerationStatus = {
          id: generationId,
          status: "queued",
          type,
          prompt,
        };
        setGenerations((prev) => [...prev, newGeneration]);

        // Add generation status message
        const statusMessage: ChatMessageData = {
          id: `status-${Date.now()}`,
          role: "assistant",
          content: `Starting ${type} generation...`,
          timestamp: new Date(),
          generationId,
        };
        setMessages((prev) => [...prev, statusMessage]);

        // Poll for generation status
        const pollGeneration = async () => {
          try {
            const statusResponse = await fetch(
              `/api/generations/${generationId}`,
            );
            if (!statusResponse.ok) return;

            const status = await statusResponse.json();

            setGenerations((prev) =>
              prev.map((gen) =>
                gen.id === generationId ? { ...gen, ...status } : gen,
              ),
            );

            if (status.status === "complete") {
              // Add completion message
              const completionMessage: ChatMessageData = {
                id: `completion-${Date.now()}`,
                role: "assistant",
                content: `Your ${type} is ready! Here's what I created for "${prompt}":`,
                timestamp: new Date(),
                generationId,
              };
              setMessages((prev) => [...prev, completionMessage]);
            } else if (status.status === "failed") {
              // Add error message
              const errorMessage: ChatMessageData = {
                id: `error-${Date.now()}`,
                role: "assistant",
                content: `I apologize, but the ${type} generation encountered an issue: ${status.error || "Unknown error"}. Would you like to try again with a different approach?`,
                timestamp: new Date(),
                generationId,
              };
              setMessages((prev) => [...prev, errorMessage]);
            } else if (
              status.status === "running" ||
              status.status === "queued"
            ) {
              // Continue polling
              setTimeout(pollGeneration, 3000);
            }
          } catch (error) {
            console.error("Failed to poll generation status:", error);
          }
        };

        // Start polling after a short delay
        setTimeout(pollGeneration, 2000);
      } catch (error) {
        console.error("Generation failed:", error);

        const errorMessage: ChatMessageData = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `I'm sorry, but I encountered an issue while processing your request. Please try again, and feel free to adjust your prompt if needed.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading],
  );

  const handleRefine = useCallback(
    async (generationId: string, refinementPrompt: string) => {
      try {
        const response = await fetch(
          `/api/generations/${generationId}/refine`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              refinementPrompt,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to start refinement");
        }

        const { newGenerationId } = await response.json();

        // Add refinement message
        const refinementMessage: ChatMessageData = {
          id: `refinement-${Date.now()}`,
          role: "assistant",
          content: `I'm creating a refined version based on your feedback: "${refinementPrompt}"`,
          timestamp: new Date(),
          generationId: newGenerationId,
        };
        setMessages((prev) => [...prev, refinementMessage]);

        // Add to generations tracking
        const originalGeneration = generations.find(
          (gen) => gen.id === generationId,
        );
        if (originalGeneration) {
          const newGeneration: GenerationStatus = {
            id: newGenerationId,
            status: "queued",
            type: originalGeneration.type,
            prompt: `${originalGeneration.prompt} (refined: ${refinementPrompt})`,
          };
          setGenerations((prev) => [...prev, newGeneration]);

          // Start polling for the new generation
          const pollRefinement = async () => {
            try {
              const statusResponse = await fetch(
                `/api/generations/${newGenerationId}`,
              );
              if (!statusResponse.ok) return;

              const status = await statusResponse.json();

              setGenerations((prev) =>
                prev.map((gen) =>
                  gen.id === newGenerationId ? { ...gen, ...status } : gen,
                ),
              );

              if (status.status === "complete") {
                const completionMessage: ChatMessageData = {
                  id: `refined-completion-${Date.now()}`,
                  role: "assistant",
                  content: `Here's your refined ${originalGeneration.type}!`,
                  timestamp: new Date(),
                  generationId: newGenerationId,
                };
                setMessages((prev) => [...prev, completionMessage]);
              } else if (status.status === "failed") {
                const errorMessage: ChatMessageData = {
                  id: `refined-error-${Date.now()}`,
                  role: "assistant",
                  content: `The refinement failed: ${status.error || "Unknown error"}`,
                  timestamp: new Date(),
                  generationId: newGenerationId,
                };
                setMessages((prev) => [...prev, errorMessage]);
              } else if (
                status.status === "running" ||
                status.status === "queued"
              ) {
                setTimeout(pollRefinement, 3000);
              }
            } catch (error) {
              console.error("Failed to poll refinement status:", error);
            }
          };

          setTimeout(pollRefinement, 2000);
        }
      } catch (error) {
        console.error("Refinement failed:", error);
        throw error;
      }
    },
    [generations],
  );

  const getGenerationForMessage = (generationId?: string) => {
    if (!generationId) return null;
    return generations.find((gen) => gen.id === generationId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            What If Visualizer
          </h1>
          <p className="text-gray-600 mt-1">
            Bring your "what if" scenarios to life with AI-generated images and
            videos
          </p>
        </div>
      </header>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-120px)]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎬</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Welcome to What If Visualizer
              </h2>
              <p className="text-gray-600 mb-6">
                Describe your "what if" scenario and I'll generate an image or
                video to bring it to life!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-sm">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <strong className="text-blue-600">
                    What if cats could fly?
                  </strong>
                  <p className="text-gray-600 mt-2">
                    Generate whimsical images of flying cats soaring through
                    clouds
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <strong className="text-green-600">
                    What if cities were underwater?
                  </strong>
                  <p className="text-gray-600 mt-2">
                    Create stunning videos of submerged metropolises with marine
                    life
                  </p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const generation = getGenerationForMessage(message.generationId);

              return (
                <div key={message.id}>
                  <ChatMessage message={message} generation={generation} />

                  {/* Show generation result separately if this message has a generation */}
                  {generation && (
                    <div className="mt-2">
                      <GenerationResult
                        generation={generation}
                        onRefine={handleRefine}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <PromptInput
            onSubmit={handleSubmit}
            disabled={isLoading}
            placeholder="What if..."
          />
        </div>
      </div>
    </div>
  );
}
