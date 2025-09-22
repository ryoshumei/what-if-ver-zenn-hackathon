"use client";

import { useState } from "react";
import AltTextEditor from "./AltTextEditor";
import CaptionsEditor from "./CaptionsEditor";

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
  type: "image" | "video";
  asset?: MediaAsset;
}

interface AccessibilityPanelProps {
  generation: Generation;
  onUpdateAsset: (
    assetId: string,
    updates: { altText?: string; captions?: string },
  ) => Promise<void>;
  className?: string;
}

export default function AccessibilityPanel({
  generation,
  onUpdateAsset,
  className = "",
}: AccessibilityPanelProps) {
  const [showAltTextEditor, setShowAltTextEditor] = useState(false);
  const [showCaptionsEditor, setShowCaptionsEditor] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!generation.asset) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-2">♿</div>
          <p className="text-sm">
            No asset available for accessibility features
          </p>
        </div>
      </div>
    );
  }

  const { asset } = generation;

  const handleSaveAltText = async (altText: string) => {
    setIsUpdating(true);
    try {
      await onUpdateAsset(asset.id, { altText });
      setShowAltTextEditor(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveCaptions = async (captions: string) => {
    setIsUpdating(true);
    try {
      await onUpdateAsset(asset.id, { captions });
      setShowCaptionsEditor(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const getAccessibilityScore = () => {
    let score = 0;
    let total = 0;

    if (generation.type === "image") {
      total = 1;
      if (asset.altText && asset.altText.trim().length > 10) score = 1;
    } else if (generation.type === "video") {
      total = 1;
      if (asset.captions && asset.captions.trim().length > 0) score = 1;
    }

    return { score, total, percentage: total > 0 ? (score / total) * 100 : 0 };
  };

  const accessibilityScore = getAccessibilityScore();

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
              <span className="text-purple-600">♿</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Accessibility</h3>
              <p className="text-sm text-gray-600">
                Make your content accessible to everyone
              </p>
            </div>
          </div>

          {/* Accessibility Score */}
          <div className="text-right">
            <div
              className={`text-lg font-bold ${
                accessibilityScore.percentage >= 100
                  ? "text-green-600"
                  : accessibilityScore.percentage >= 50
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              {accessibilityScore.percentage.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {generation.type === "image" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Alt Text</h4>
                <p className="text-sm text-gray-600">
                  Describes the image for screen readers and users who can't see
                  images
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {asset.altText ? (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    ✓ Added
                  </span>
                ) : (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                    ⚠ Missing
                  </span>
                )}
              </div>
            </div>

            {asset.altText ? (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-700 mb-2">
                  Current alt text:
                </div>
                <div className="text-sm text-gray-900 italic">
                  "{asset.altText}"
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 mt-0.5">⚠️</span>
                  <div>
                    <div className="text-sm font-medium text-yellow-800">
                      Alt text required
                    </div>
                    <div className="text-sm text-yellow-700">
                      Screen readers won't be able to describe this image to
                      users with visual impairments.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAltTextEditor(true)}
              className="w-full px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium"
              disabled={isUpdating}
            >
              {asset.altText ? "Edit Alt Text" : "Add Alt Text"}
            </button>
          </div>
        )}

        {generation.type === "video" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Captions</h4>
                <p className="text-sm text-gray-600">
                  Provides text for audio content to help deaf and
                  hard-of-hearing users
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {asset.captions ? (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    ✓ Added
                  </span>
                ) : (
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                    Optional
                  </span>
                )}
              </div>
            </div>

            {asset.captions ? (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-700 mb-2">
                  Captions available ({asset.captions.length} characters)
                </div>
                <div className="text-xs text-gray-600">
                  {asset.captions.includes("WEBVTT")
                    ? "Timed captions"
                    : "General transcript"}
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-0.5">💬</span>
                  <div>
                    <div className="text-sm font-medium text-blue-800">
                      Captions recommended
                    </div>
                    <div className="text-sm text-blue-700">
                      Add captions to make your video accessible to more users.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowCaptionsEditor(true)}
              className="w-full px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium"
              disabled={isUpdating}
            >
              {asset.captions ? "Edit Captions" : "Add Captions"}
            </button>
          </div>
        )}

        {/* General Tips */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h5 className="font-medium text-gray-800 mb-2">
            Why Accessibility Matters
          </h5>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Makes content usable by people with disabilities</li>
            <li>• Improves SEO and discoverability</li>
            <li>• Benefits users in noisy or quiet environments</li>
            <li>• Shows consideration for all community members</li>
          </ul>
        </div>

        {/* Compliance Info */}
        {accessibilityScore.percentage >= 100 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-green-800">
              <span>✅</span>
              <span className="text-sm font-medium">
                Accessibility Complete
              </span>
            </div>
            <div className="text-sm text-green-700 mt-1">
              Your content meets basic accessibility standards and can be
              enjoyed by everyone.
            </div>
          </div>
        )}
      </div>

      {/* Editors */}
      {showAltTextEditor && (
        <AltTextEditor
          imageUrl={asset.url}
          currentAltText={asset.altText || ""}
          onSave={handleSaveAltText}
          onCancel={() => setShowAltTextEditor(false)}
        />
      )}

      {showCaptionsEditor && (
        <CaptionsEditor
          videoUrl={asset.url}
          currentCaptions={asset.captions || ""}
          onSave={handleSaveCaptions}
          onCancel={() => setShowCaptionsEditor(false)}
        />
      )}
    </div>
  );
}
