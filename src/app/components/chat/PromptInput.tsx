"use client";

import { useState } from "react";
import { validatePromptText } from "../../../lib/models/IdeaPrompt";

interface PromptInputProps {
  onSubmit: (prompt: string, type: "image" | "video") => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function PromptInput({
  onSubmit,
  disabled = false,
  placeholder = "What if...",
}: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<"image" | "video">("image");
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validatePromptText(prompt);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    onSubmit(prompt, type);
  };

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    if (errors.length > 0) {
      // Clear errors when user starts typing
      setErrors([]);
    }
  };

  const charCount = prompt.length;
  const maxChars = 2000;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
      <div className="space-y-4">
        {/* Generation Type Toggle */}
        <div className="flex items-center justify-center space-x-4">
          <button
            type="button"
            onClick={() => setType("image")}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${
              type === "image"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            disabled={disabled}
          >
            🖼️ Image
          </button>
          <button
            type="button"
            onClick={() => setType("video")}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${
              type === "video"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            disabled={disabled}
          >
            🎬 Video
          </button>
        </div>

        {/* Prompt Input */}
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.length > 0 ? "border-red-300 bg-red-50" : "border-gray-300"
            } ${disabled ? "bg-gray-50 cursor-not-allowed" : ""}`}
            rows={3}
            maxLength={maxChars}
          />

          {/* Character Count */}
          <div className="absolute bottom-2 right-2 text-xs text-gray-500">
            {charCount}/{maxChars}
          </div>
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="text-red-600 text-sm space-y-1">
            {errors.map((error, index) => (
              <div
                key={`error-${index}-${error.substring(0, 10)}`}
                className="flex items-start space-x-2"
              >
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={disabled || !prompt.trim()}
            className={`px-8 py-3 rounded-full font-medium transition-colors ${
              disabled || !prompt.trim()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {disabled
              ? "Generating..."
              : `Generate ${type === "image" ? "🖼️" : "🎬"}`}
          </button>
        </div>

        {/* Suggestions */}
        {prompt.length > 0 && prompt.length < 20 && (
          <div className="text-center text-sm text-gray-600">
            💡 Try adding more details about the scene, colors, or mood
          </div>
        )}
      </div>
    </form>
  );
}
