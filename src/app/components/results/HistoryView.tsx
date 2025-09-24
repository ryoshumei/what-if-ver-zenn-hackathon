"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

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

interface HistoryViewProps {
  generations: Generation[];
  onSelect?: (generation: Generation) => void;
  onCompare?: (generationA: Generation, generationB: Generation) => void;
  onRefine?: (generation: Generation) => void;
  onPublish?: (generation: Generation) => void;
}

export default function HistoryView({
  generations,
  onSelect: _onSelect,
  onCompare,
  onRefine,
  onPublish,
}: HistoryViewProps) {
  const [selectedGenerations, setSelectedGenerations] = useState<Generation[]>(
    [],
  );
  const [filterType, setFilterType] = useState<"all" | "image" | "video">(
    "all",
  );
  const [filterStatus, setFilterStatus] = useState<
    "all" | "queued" | "running" | "complete" | "failed"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGenerations = useMemo(() => {
    return generations
      .filter((gen) => {
        // Type filter
        if (filterType !== "all" && gen.type !== filterType) return false;

        // Status filter
        if (filterStatus !== "all" && gen.status !== filterStatus) return false;

        // Search filter (by prompt text - would need to fetch from IdeaPrompt)
        if (searchQuery) {
          // For now, search by generation ID or model
          const searchLower = searchQuery.toLowerCase();
          return (
            gen.id.toLowerCase().includes(searchLower) ||
            gen.model.toLowerCase().includes(searchLower)
          );
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [generations, filterType, filterStatus, searchQuery]);

  const handleSelectionToggle = (generation: Generation) => {
    setSelectedGenerations((prev) => {
      const isSelected = prev.some((g) => g.id === generation.id);
      if (isSelected) {
        return prev.filter((g) => g.id !== generation.id);
      } else {
        // Limit to 2 selections for comparison
        return prev.length >= 2 ? [prev[1], generation] : [...prev, generation];
      }
    });
  };

  const handleCompare = () => {
    if (selectedGenerations.length === 2 && onCompare) {
      onCompare(selectedGenerations[0], selectedGenerations[1]);
    }
  };

  const renderAssetPreview = (generation: Generation) => {
    if (!generation.asset) {
      return (
        <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-2xl mb-1">
              {generation.type === "image" ? "🖼️" : "🎬"}
            </div>
            <span className="text-xs">
              {generation.status === "complete"
                ? "No asset"
                : generation.status}
            </span>
          </div>
        </div>
      );
    }

    const { asset } = generation;

    if (generation.type === "image") {
      return (
        <Image
          src={asset.url}
          alt={asset.altText || "Generated image"}
          width={300}
          height={200}
          className="w-full h-32 object-cover rounded-lg"
          unoptimized
        />
      );
    }

    if (generation.type === "video") {
      return (
        <video
          src={asset.url}
          width={300}
          height={200}
          className="w-full h-32 object-cover rounded-lg"
          muted
          preload="metadata"
        />
      );
    }

    return null;
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Generation History</h2>

        {selectedGenerations.length === 2 && (
          <button
            type="button"
            onClick={handleCompare}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>🔍</span>
            <span>Compare Selected</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        {/* Search */}
        <div className="flex-1 min-w-64">
          <input
            type="text"
            placeholder="Search generations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) =>
            setFilterType(e.target.value as "all" | "image" | "video")
          }
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(
              e.target.value as
                | "all"
                | "queued"
                | "running"
                | "complete"
                | "failed",
            )
          }
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="queued">Queued</option>
          <option value="running">Running</option>
          <option value="complete">Complete</option>
          <option value="failed">Failed</option>
        </select>

        {/* Clear Filters */}
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            setFilterType("all");
            setFilterStatus("all");
            setSelectedGenerations([]);
          }}
          className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
        >
          Clear All
        </button>
      </div>

      {/* Selection Info */}
      {selectedGenerations.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedGenerations.length} selected for comparison
              {selectedGenerations.length < 2 && " (select 1 more to compare)"}
            </span>
            <button
              type="button"
              onClick={() => setSelectedGenerations([])}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGenerations.map((generation) => {
          const isSelected = selectedGenerations.some(
            (g) => g.id === generation.id,
          );

          return (
            <div
              key={generation.id}
              className={`bg-white rounded-lg border-2 transition-all relative ${
                isSelected
                  ? "border-blue-500 ring-2 ring-blue-500 ring-opacity-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* Invisible selection button overlay */}
              <button
                type="button"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onClick={() => handleSelectionToggle(generation)}
                aria-pressed={isSelected}
                aria-label={`${isSelected ? "Deselect" : "Select"} generation: ${generation.id}`}
              />
              {/* Asset Preview */}
              <div className="relative">
                {renderAssetPreview(generation)}

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-2 left-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
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

                {/* Type Badge */}
                <div className="absolute bottom-2 left-2">
                  <span className="px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                    {generation.type === "image" ? "🖼️ Image" : "🎬 Video"}
                  </span>
                </div>
              </div>

              {/* Generation Info */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {generation.type.charAt(0).toUpperCase() +
                      generation.type.slice(1)}{" "}
                    Generation
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(generation.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="text-xs text-gray-600 space-y-1">
                  <div>Model: {generation.model}</div>
                  {generation.asset && (
                    <div className="flex space-x-4">
                      {generation.asset.width && generation.asset.height && (
                        <span>
                          {generation.asset.width}×{generation.asset.height}
                        </span>
                      )}
                      {generation.asset.durationSec && (
                        <span>{generation.asset.durationSec}s</span>
                      )}
                    </div>
                  )}
                  {generation.refinementOf && (
                    <div className="text-purple-600">🔄 Refined</div>
                  )}
                </div>

                {/* Action Buttons */}
                {generation.status === "complete" && onRefine && onPublish && (
                  <div className="flex space-x-2 mt-3 relative z-20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRefine(generation);
                      }}
                      className="flex-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                    >
                      Refine
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPublish(generation);
                      }}
                      className="flex-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                    >
                      Publish
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredGenerations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No generations found
          </h3>
          <p className="text-gray-600">
            {generations.length === 0
              ? "You haven't created any generations yet. Start by describing a 'what if' scenario!"
              : "Try adjusting your search or filter criteria."}
          </p>
        </div>
      )}
    </div>
  );
}
