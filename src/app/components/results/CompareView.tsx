"use client";

import Image from "next/image";
import { useState } from "react";

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

interface Generation {
  id: string;
  promptId: string | null;
  type: "image" | "video";
  status: "queued" | "running" | "complete" | "failed";
  model: string;
  refinementOf?: string | null;
  createdAt: string;
  updatedAt: string;
  asset?: MediaAsset;
  error?: string;
}

interface CompareViewProps {
  generationA: Generation;
  generationB: Generation;
  onClose?: () => void;
  onRefine?: (generation: Generation) => void;
  onPublish?: (generation: Generation) => void;
}

export default function CompareView({
  generationA,
  generationB,
  onClose,
  onRefine,
  onPublish,
}: CompareViewProps) {
  const [_selectedGeneration, _setSelectedGeneration] =
    useState<Generation | null>(null);

  const renderAsset = (generation: Generation, side: "left" | "right") => {
    if (!generation.asset) {
      return (
        <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">
              {generation.type === "image" ? "🖼️" : "🎬"}
            </div>
            <p className="text-sm">No asset available</p>
            <p className="text-xs text-gray-400 mt-1">
              Status: {generation.status}
            </p>
          </div>
        </div>
      );
    }

    const { asset } = generation;

    if (generation.type === "image") {
      return (
        <div className="relative">
          <Image
            src={asset.url}
            alt={asset.altText || `Generated image ${side}`}
            width={asset.width || 512}
            height={asset.height || 512}
            className="w-full h-auto max-h-96 object-contain rounded-lg"
            unoptimized
          />
          {asset.altText && (
            <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-60 text-white text-xs p-2 rounded">
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
            className="w-full h-auto max-h-96 object-contain rounded-lg"
            poster={asset.url.replace(".mp4", "_thumbnail.jpg")}
          >
            <track
              kind="captions"
              src={asset.captions || ""}
              srcLang="en"
              label="English"
              default={!!asset.captions}
            />
          </video>
          {asset.captions && (
            <p className="text-xs text-gray-500 mt-1">Captions available</p>
          )}
        </div>
      );
    }

    return null;
  };

  const renderMetadata = (generation: Generation) => {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Type:</span>
            <span className="ml-2 capitalize">{generation.type}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <span
              className={`ml-2 px-2 py-1 rounded-full text-xs ${
                generation.status === "complete"
                  ? "bg-green-100 text-green-800"
                  : generation.status === "failed"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {generation.status}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Model:</span>
            <span className="ml-2">{generation.model}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Created:</span>
            <span className="ml-2">
              {new Date(generation.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {generation.asset && (
          <div className="pt-2 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {generation.asset.width && generation.asset.height && (
                <div>
                  <span className="font-medium text-gray-700">Dimensions:</span>
                  <span className="ml-2">
                    {generation.asset.width} × {generation.asset.height}
                  </span>
                </div>
              )}
              {generation.asset.durationSec && (
                <div>
                  <span className="font-medium text-gray-700">Duration:</span>
                  <span className="ml-2">{generation.asset.durationSec}s</span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Format:</span>
                <span className="ml-2 uppercase">
                  {generation.asset.format}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Visibility:</span>
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    generation.asset.visibility === "public"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {generation.asset.visibility}
                </span>
              </div>
            </div>
          </div>
        )}

        {generation.refinementOf && (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center text-sm text-purple-600">
              <span className="mr-2">🔄</span>
              <span>This is a refined version of another generation</span>
            </div>
          </div>
        )}

        {generation.error && (
          <div className="pt-2 border-t border-gray-200">
            <div className="text-sm text-red-600">
              <span className="font-medium">Error:</span>
              <span className="ml-2">{generation.error}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Compare Generations
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {/* Comparison Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Generation A */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Generation A
                </h3>
                <div className="flex space-x-2">
                  {generationA.status === "complete" && onRefine && (
                    <button
                      type="button"
                      onClick={() => onRefine(generationA)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                    >
                      Refine
                    </button>
                  )}
                  {generationA.status === "complete" && onPublish && (
                    <button
                      type="button"
                      onClick={() => onPublish(generationA)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                    >
                      Publish
                    </button>
                  )}
                </div>
              </div>

              {/* Asset Display */}
              <div className="border-2 border-gray-200 rounded-lg p-4">
                {renderAsset(generationA, "left")}
              </div>

              {/* Metadata */}
              <div className="bg-gray-50 rounded-lg p-4">
                {renderMetadata(generationA)}
              </div>
            </div>

            {/* Generation B */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Generation B
                </h3>
                <div className="flex space-x-2">
                  {generationB.status === "complete" && onRefine && (
                    <button
                      type="button"
                      onClick={() => onRefine(generationB)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                    >
                      Refine
                    </button>
                  )}
                  {generationB.status === "complete" && onPublish && (
                    <button
                      type="button"
                      onClick={() => onPublish(generationB)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                    >
                      Publish
                    </button>
                  )}
                </div>
              </div>

              {/* Asset Display */}
              <div className="border-2 border-gray-200 rounded-lg p-4">
                {renderAsset(generationB, "right")}
              </div>

              {/* Metadata */}
              <div className="bg-gray-50 rounded-lg p-4">
                {renderMetadata(generationB)}
              </div>
            </div>
          </div>

          {/* Comparison Summary */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">
              Comparison Summary
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800">Type Match:</span>
                <span
                  className={`ml-2 ${
                    generationA.type === generationB.type
                      ? "text-green-600"
                      : "text-orange-600"
                  }`}
                >
                  {generationA.type === generationB.type
                    ? "✓ Same"
                    : "⚠ Different"}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-800">Model Match:</span>
                <span
                  className={`ml-2 ${
                    generationA.model === generationB.model
                      ? "text-green-600"
                      : "text-orange-600"
                  }`}
                >
                  {generationA.model === generationB.model
                    ? "✓ Same"
                    : "⚠ Different"}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-800">
                  Time Difference:
                </span>
                <span className="ml-2 text-gray-700">
                  {Math.abs(
                    new Date(generationA.createdAt).getTime() -
                      new Date(generationB.createdAt).getTime(),
                  ) /
                    (1000 * 60)}{" "}
                  min
                </span>
              </div>
            </div>

            {/* Refinement Relationship */}
            {(generationA.refinementOf === generationB.id ||
              generationB.refinementOf === generationA.id) && (
              <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
                <div className="flex items-center text-purple-800">
                  <span className="mr-2">🔄</span>
                  <span className="text-sm">
                    These generations are related: one is a refinement of the
                    other
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Select actions above for individual generations, or close to return
            to history
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
