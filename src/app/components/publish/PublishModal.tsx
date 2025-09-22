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

interface PublishModalProps {
  generation: Generation;
  onClose: () => void;
  onPublish: (data: PublishData) => Promise<void>;
}

interface PublishData {
  generationId: string;
  title: string;
  description: string;
  visibility: "public" | "unlisted";
  allowRefinements: boolean;
  altText?: string;
  captions?: string;
  tags: string[];
}

export default function PublishModal({
  generation,
  onClose,
  onPublish,
}: PublishModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [allowRefinements, setAllowRefinements] = useState(true);
  const [altText, setAltText] = useState(generation.asset?.altText || "");
  const [captions, setCaptions] = useState(generation.asset?.captions || "");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.length > 100) {
      newErrors.title = "Title must be 100 characters or less";
    }

    if (!description.trim()) {
      newErrors.description = "Description is required";
    } else if (description.length > 500) {
      newErrors.description = "Description must be 500 characters or less";
    }

    if (generation.type === "image" && !altText.trim()) {
      newErrors.altText = "Alt text is required for accessibility";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const publishData: PublishData = {
        generationId: generation.id,
        title: title.trim(),
        description: description.trim(),
        visibility,
        allowRefinements,
        altText: altText.trim() || undefined,
        captions: captions.trim() || undefined,
        tags,
      };

      await onPublish(publishData);
      onClose();
    } catch (error) {
      console.error("Failed to publish:", error);
      setErrors({ submit: "Failed to publish. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const renderAssetPreview = () => {
    if (!generation.asset) {
      return (
        <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-3xl mb-2">
              {generation.type === "image" ? "🖼️" : "🎬"}
            </div>
            <p className="text-sm">No asset available</p>
          </div>
        </div>
      );
    }

    const { asset } = generation;

    if (generation.type === "image") {
      return (
        <Image
          src={asset.url}
          alt={altText || "Generated image preview"}
          width={asset.width || 400}
          height={asset.height || 300}
          className="w-full h-48 object-cover rounded-lg"
          unoptimized
        />
      );
    }

    if (generation.type === "video") {
      return (
        <video
          src={asset.url}
          width={asset.width || 400}
          height={asset.height || 300}
          controls
          className="w-full h-48 object-cover rounded-lg"
          muted
          preload="metadata"
        />
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Publish{" "}
            {generation.type.charAt(0).toUpperCase() + generation.type.slice(1)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Asset Preview */}
          <div className="space-y-2">
            <div className="block text-sm font-medium text-gray-700">
              Preview
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              {renderAssetPreview()}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700"
            >
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="Give your creation a catchy title"
              maxLength={100}
              disabled={isLoading}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title}</p>
            )}
            <p className="text-xs text-gray-500">
              {title.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Description *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                errors.description ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="Describe your creation and the 'what if' scenario that inspired it"
              maxLength={500}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
            <p className="text-xs text-gray-500">
              {description.length}/500 characters
            </p>
          </div>

          {/* Accessibility */}
          {generation.type === "image" && (
            <div className="space-y-2">
              <label
                htmlFor="altText"
                className="block text-sm font-medium text-gray-700"
              >
                Alt Text *{" "}
                <span className="text-xs text-gray-500">
                  (for accessibility)
                </span>
              </label>
              <input
                type="text"
                id="altText"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.altText ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Describe what's in the image for screen readers"
                maxLength={200}
                disabled={isLoading}
              />
              {errors.altText && (
                <p className="text-sm text-red-600">{errors.altText}</p>
              )}
              <p className="text-xs text-gray-500">
                {altText.length}/200 characters
              </p>
            </div>
          )}

          {generation.type === "video" && (
            <div className="space-y-2">
              <label
                htmlFor="captions"
                className="block text-sm font-medium text-gray-700"
              >
                Captions{" "}
                <span className="text-xs text-gray-500">
                  (optional, for accessibility)
                </span>
              </label>
              <textarea
                id="captions"
                value={captions}
                onChange={(e) => setCaptions(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Add captions or transcript for accessibility"
                maxLength={1000}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                {captions.length}/1000 characters
              </p>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <div className="block text-sm font-medium text-gray-700">
              Tags <span className="text-xs text-gray-500">(up to 10)</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                    disabled={isLoading}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add a tag"
                maxLength={20}
                disabled={isLoading || tags.length >= 10}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                disabled={!tagInput.trim() || tags.length >= 10 || isLoading}
              >
                Add
              </button>
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-3">
            <div className="block text-sm font-medium text-gray-700">
              Visibility
            </div>
            <div className="space-y-2">
              <label className="flex items-start space-x-3">
                <input
                  type="radio"
                  value="public"
                  checked={visibility === "public"}
                  onChange={(e) => setVisibility(e.target.value as "public")}
                  className="mt-1"
                  disabled={isLoading}
                />
                <div>
                  <div className="font-medium">🌍 Public</div>
                  <div className="text-sm text-gray-600">
                    Anyone can see this in the community feed and search results
                  </div>
                </div>
              </label>
              <label className="flex items-start space-x-3">
                <input
                  type="radio"
                  value="unlisted"
                  checked={visibility === "unlisted"}
                  onChange={(e) => setVisibility(e.target.value as "unlisted")}
                  className="mt-1"
                  disabled={isLoading}
                />
                <div>
                  <div className="font-medium">🔗 Unlisted</div>
                  <div className="text-sm text-gray-600">
                    Only people with the direct link can see this
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Allow Refinements */}
          <div className="space-y-2">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={allowRefinements}
                onChange={(e) => setAllowRefinements(e.target.checked)}
                disabled={isLoading}
              />
              <div>
                <div className="font-medium">
                  Allow others to refine this creation
                </div>
                <div className="text-sm text-gray-600">
                  Other users can create variations based on your work (with
                  attribution)
                </div>
              </div>
            </label>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 py-2 rounded-lg font-medium ${
                isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              disabled={isLoading}
            >
              {isLoading ? "Publishing..." : "Publish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
