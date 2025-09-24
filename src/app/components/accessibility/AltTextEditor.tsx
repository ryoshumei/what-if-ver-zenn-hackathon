"use client";

import Image from "next/image";
import { useState } from "react";

interface AltTextEditorProps {
  imageUrl: string;
  currentAltText?: string;
  onSave: (altText: string) => Promise<void>;
  onCancel: () => void;
  maxLength?: number;
}

export default function AltTextEditor({
  imageUrl,
  currentAltText = "",
  onSave,
  onCancel,
  maxLength = 250,
}: AltTextEditorProps) {
  const [altText, setAltText] = useState(currentAltText);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!altText.trim()) {
      setError("Alt text is required for accessibility");
      return;
    }

    if (altText.length > maxLength) {
      setError(`Alt text must be ${maxLength} characters or less`);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await onSave(altText.trim());
    } catch (_err) {
      setError("Failed to save alt text. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    {
      title: "Describe the main subject",
      example:
        "A majestic white cat with blue eyes flying through fluffy clouds",
    },
    {
      title: "Include important details",
      example: "Colors, emotions, setting, and key visual elements",
    },
    {
      title: "Keep it concise but descriptive",
      example: "Focus on what's most important for understanding the image",
    },
    {
      title: "Avoid redundant phrases",
      example: 'Don\'t start with "Image of..." or "Picture showing..."',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Alt Text</h2>
            <p className="text-sm text-gray-600 mt-1">
              Help screen readers understand your image by providing descriptive
              text
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Preview */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Image Preview</h3>
              <div className="border border-gray-200 rounded-lg p-4">
                <Image
                  src={imageUrl}
                  alt={altText || "Image being described"}
                  width={400}
                  height={300}
                  className="w-full h-auto max-h-96 object-contain rounded-lg"
                  unoptimized
                />
              </div>

              {/* Current alt text preview */}
              {altText && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-blue-800 mb-1">
                    Screen reader will announce:
                  </div>
                  <div className="text-sm text-blue-700 italic">
                    "{altText}"
                  </div>
                </div>
              )}
            </div>

            {/* Alt Text Editor */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Alt Text</h3>
                <textarea
                  value={altText}
                  onChange={(e) => {
                    setAltText(e.target.value);
                    setError("");
                  }}
                  placeholder="Describe what you see in this image..."
                  className={`w-full h-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none placeholder-gray-500 text-gray-900 ${
                    error ? "border-red-400" : "border-gray-300 bg-white"
                  }`}
                  maxLength={maxLength}
                  disabled={isLoading}
                />
                <div className="flex justify-between items-center mt-1">
                  <div
                    className={`text-xs ${
                      altText.length > maxLength * 0.9
                        ? "text-orange-600"
                        : "text-gray-500"
                    }`}
                  >
                    {altText.length}/{maxLength} characters
                  </div>
                  {error && (
                    <span className="text-sm text-red-600">{error}</span>
                  )}
                </div>
              </div>

              {/* Guidelines */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">
                  Writing Good Alt Text
                </h4>
                <div className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={`suggestion-${suggestion.title}-${index}`}
                      className="text-sm"
                    >
                      <div className="font-medium text-gray-700 mb-1">
                        {suggestion.title}
                      </div>
                      <div className="text-gray-600 italic">
                        {suggestion.example}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="text-sm font-medium text-yellow-800 mb-2">
                  Quick Start
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setAltText("A generated AI image showing ")}
                    className="text-sm text-yellow-700 hover:text-yellow-900 underline"
                    disabled={isLoading}
                  >
                    Start with "A generated AI image showing..."
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAltText('A "what if" scenario depicting ')
                    }
                    className="text-sm text-yellow-700 hover:text-yellow-900 underline block"
                    disabled={isLoading}
                  >
                    Start with "A 'what if' scenario depicting..."
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    isLoading || !altText.trim()
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                  disabled={isLoading || !altText.trim()}
                >
                  {isLoading ? "Saving..." : "Save Alt Text"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
