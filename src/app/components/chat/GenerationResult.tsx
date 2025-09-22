"use client";

import Image from "next/image";
import { memo, useState } from "react";

interface MediaAsset {
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
}

interface GenerationStatus {
  id: string;
  status: "queued" | "running" | "complete" | "failed";
  type: "image" | "video";
  prompt: string;
  asset?: MediaAsset;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface GenerationResultProps {
  generation: GenerationStatus;
  onRefine?: (generationId: string, refinementPrompt: string) => void;
}

const GenerationResult = memo(function GenerationResult({
  generation,
  onRefine,
}: GenerationResultProps) {
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  const handleRefine = async () => {
    if (!refinementPrompt.trim() || !onRefine) return;

    setIsRefining(true);
    try {
      await onRefine(generation.id, refinementPrompt.trim());
      setRefinementPrompt("");
      setShowRefineInput(false);
    } catch (error) {
      console.error("Failed to refine generation:", error);
    } finally {
      setIsRefining(false);
    }
  };

  const renderAsset = () => {
    if (!generation.asset) {
      // Fallback placeholder for completed generations without asset data
      return (
        <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg h-48 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">
              {generation.type === "image" ? "🖼️" : "🎬"}
            </div>
            <p className="text-sm text-gray-600">Generated {generation.type}</p>
            <p className="text-xs text-gray-500 mt-1">
              "{generation.prompt.substring(0, 50)}..."
            </p>
          </div>
        </div>
      );
    }

    const { asset } = generation;

    if (generation.type === "image") {
      return (
        <div className="relative group">
          <Image
            src={asset.url}
            alt={asset.altText || `Generated image: ${generation.prompt}`}
            width={asset.width || 512}
            height={asset.height || 512}
            className="w-full h-auto rounded-lg"
            unoptimized // For generated images that might not be optimized
          />
          {asset.altText && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
              {asset.altText}
            </div>
          )}
        </div>
      );
    }

    if (generation.type === "video") {
      return (
        <div className="relative">
          <video
            src={asset.url}
            width={asset.width || 640}
            height={asset.height || 360}
            controls
            className="w-full h-auto rounded-lg"
            poster={asset.url.replace(".mp4", "_thumbnail.jpg")} // Attempt to use thumbnail
          >
            <track
              kind="captions"
              src={asset.captions || ""}
              srcLang="en"
              label="English"
              default={!!asset.captions}
            />
            Your browser does not support the video tag.
          </video>
          {asset.captions && (
            <p className="text-xs text-gray-500 mt-1">Captions available</p>
          )}
        </div>
      );
    }

    return null;
  };

  if (generation.status === "queued") {
    return (
      <div className="flex items-center space-x-2 text-gray-600 p-3 bg-blue-50 rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm">Queued for generation...</span>
      </div>
    );
  }

  if (generation.status === "running") {
    return (
      <div className="flex items-center space-x-2 text-gray-600 p-3 bg-blue-50 rounded-lg">
        <div className="animate-pulse rounded-full h-4 w-4 bg-blue-600"></div>
        <span className="text-sm">Generating {generation.type}...</span>
      </div>
    );
  }

  if (generation.status === "failed") {
    return (
      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center space-x-2 text-red-600 mb-2">
          <span className="text-sm">❌ Generation failed</span>
        </div>
        {generation.error && (
          <p className="text-xs text-red-500">{generation.error}</p>
        )}
        <button
          type="button"
          onClick={() => setShowRefineInput(true)}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Try again with different parameters
        </button>
      </div>
    );
  }

  if (generation.status === "complete") {
    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">
            Generated {generation.type}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-green-600 flex items-center">
              ✅ Complete
            </span>
            <button
              type="button"
              onClick={() => setShowRefineInput(!showRefineInput)}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Refine
            </button>
          </div>
        </div>

        {/* Asset Display */}
        {renderAsset()}

        {/* Metadata */}
        <div className="mt-2 text-xs text-gray-500 space-y-1">
          <div>Prompt: "{generation.prompt}"</div>
          {generation.asset && (
            <div className="flex space-x-4">
              {generation.asset.width && generation.asset.height && (
                <span>
                  Size: {generation.asset.width}x{generation.asset.height}
                </span>
              )}
              {generation.asset.durationSec && (
                <span>Duration: {generation.asset.durationSec}s</span>
              )}
              <span>Format: {generation.asset.format}</span>
            </div>
          )}
        </div>

        {/* Refinement Input */}
        {showRefineInput && (
          <div className="mt-3 p-3 bg-white rounded border border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Refine this {generation.type}
            </div>
            <textarea
              value={refinementPrompt}
              onChange={(e) => setRefinementPrompt(e.target.value)}
              placeholder="Describe how you'd like to modify this generation..."
              className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
              rows={2}
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">
                {refinementPrompt.length}/500
              </span>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRefineInput(false)}
                  className="text-xs text-gray-600 hover:text-gray-800"
                  disabled={isRefining}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRefine}
                  disabled={!refinementPrompt.trim() || isRefining}
                  className={`text-xs px-3 py-1 rounded ${
                    !refinementPrompt.trim() || isRefining
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isRefining ? "Refining..." : "Refine"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
});

export default GenerationResult;
