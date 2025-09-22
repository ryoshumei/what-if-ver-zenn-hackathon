"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CaptionSegment {
  start: number;
  end: number;
  text: string;
}

interface CaptionsEditorProps {
  videoUrl: string;
  currentCaptions?: string;
  onSave: (captions: string) => Promise<void>;
  onCancel: () => void;
}

export default function CaptionsEditor({
  videoUrl,
  currentCaptions = "",
  onSave,
  onCancel,
}: CaptionsEditorProps) {
  const [captions, setCaptions] = useState(currentCaptions);
  const [segments, setSegments] = useState<CaptionSegment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [_isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSegment, setActiveSegment] = useState(-1);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Helper functions
  const parseTimestamp = useCallback((timestamp: string): number => {
    const [time, ms] = timestamp.split(".");
    const [hours, minutes, seconds] = time.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds + Number(ms) / 1000;
  }, []);

  const parseWebVTT = useCallback(
    (vttContent: string): CaptionSegment[] => {
      const lines = vttContent.split("\n");
      const segments: CaptionSegment[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Look for timestamp lines (e.g., "00:00:00.000 --> 00:00:05.000")
        const timeMatch = line.match(
          /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/,
        );

        if (timeMatch) {
          const start = parseTimestamp(timeMatch[1]);
          const end = parseTimestamp(timeMatch[2]);

          // Get text from next non-empty line
          let text = "";
          for (let j = i + 1; j < lines.length; j++) {
            const textLine = lines[j].trim();
            if (textLine === "") break;
            if (textLine.includes("-->")) break;
            text += (text ? " " : "") + textLine;
          }

          if (text) {
            segments.push({ start, end, text });
          }
        }
      }

      return segments;
    },
    [parseTimestamp],
  );

  // Parse existing captions on mount
  useEffect(() => {
    if (currentCaptions) {
      try {
        // Try to parse as WebVTT format
        const parsed = parseWebVTT(currentCaptions);
        setSegments(parsed);
      } catch {
        // If parsing fails, treat as plain text
        setCaptions(currentCaptions);
      }
    }
  }, [currentCaptions, parseWebVTT]);

  // Update current time from video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);

      // Find active segment
      const active = segments.findIndex(
        (seg) => video.currentTime >= seg.start && video.currentTime <= seg.end,
      );
      setActiveSegment(active);
    };

    const updatePlayState = () => setIsPlaying(!video.paused);

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("play", updatePlayState);
    video.addEventListener("pause", updatePlayState);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("play", updatePlayState);
      video.removeEventListener("pause", updatePlayState);
    };
  }, [segments]);

  const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
  };

  const generateWebVTT = (): string => {
    if (segments.length === 0) return captions;

    let vtt = "WEBVTT\n\n";

    segments.forEach((segment, index) => {
      vtt += `${index + 1}\n`;
      vtt += `${formatTimestamp(segment.start)} --> ${formatTimestamp(segment.end)}\n`;
      vtt += `${segment.text}\n\n`;
    });

    return vtt;
  };

  const addSegment = () => {
    const video = videoRef.current;
    if (!video) return;

    const start = video.currentTime;
    const end = Math.min(start + 5, video.duration || start + 5); // 5 second default

    const newSegment: CaptionSegment = {
      start,
      end,
      text: "",
    };

    setSegments((prev) =>
      [...prev, newSegment].sort((a, b) => a.start - b.start),
    );
  };

  const updateSegment = (
    index: number,
    field: keyof CaptionSegment,
    value: string | number,
  ) => {
    setSegments((prev) =>
      prev.map((seg, i) => (i === index ? { ...seg, [field]: value } : seg)),
    );
  };

  const deleteSegment = (index: number) => {
    setSegments((prev) => prev.filter((_, i) => i !== index));
  };

  const seekToSegment = (segment: CaptionSegment) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = segment.start;
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError("");

    try {
      const finalCaptions = segments.length > 0 ? generateWebVTT() : captions;
      await onSave(finalCaptions);
    } catch (_err) {
      setError("Failed to save captions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Captions</h2>
            <p className="text-sm text-gray-600 mt-1">
              Add captions to make your video accessible to everyone
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
            {/* Video Player */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Video Preview</h3>

              <div className="border border-gray-200 rounded-lg p-4">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="w-full h-auto max-h-80 rounded-lg"
                  preload="metadata"
                >
                  <track kind="captions" srcLang="en" label="English" />
                </video>
              </div>

              {/* Video Controls */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-700">
                    Current Time: {formatTimestamp(currentTime)}
                  </div>
                  <button
                    type="button"
                    onClick={addSegment}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Add Caption Here
                  </button>
                </div>

                {activeSegment >= 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <div className="text-sm font-medium text-blue-800">
                      Active Caption:
                    </div>
                    <div className="text-sm text-blue-700">
                      {segments[activeSegment]?.text || "No text"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Captions Editor */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Captions</h3>
                <div className="text-sm text-gray-600">
                  {segments.length} segments
                </div>
              </div>

              {segments.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <div className="text-3xl mb-2">💬</div>
                    <p className="text-gray-600 mb-4">
                      No timed captions yet. You can add them by clicking "Add
                      Caption Here" while watching the video.
                    </p>
                    <p className="text-sm text-gray-500">
                      Or add general captions below:
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="general-captions"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      General Captions/Transcript
                    </label>
                    <textarea
                      id="general-captions"
                      value={captions}
                      onChange={(e) => setCaptions(e.target.value)}
                      placeholder="Add a general description or transcript of the video audio..."
                      className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      maxLength={2000}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {captions.length}/2000 characters
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {segments.map((segment, index) => (
                    <div
                      key={`segment-${segment.start}-${segment.end}-${index}`}
                      className={`border rounded-lg p-3 ${
                        index === activeSegment
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-700">
                          Caption {index + 1}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => seekToSegment(segment)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            🎯 Seek
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSegment(index)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label
                            htmlFor={`segment-start-${index}`}
                            className="block text-xs text-gray-600 mb-1"
                          >
                            Start Time
                          </label>
                          <input
                            id={`segment-start-${index}`}
                            type="number"
                            step="0.1"
                            value={segment.start}
                            onChange={(e) =>
                              updateSegment(
                                index,
                                "start",
                                Number(e.target.value),
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`segment-end-${index}`}
                            className="block text-xs text-gray-600 mb-1"
                          >
                            End Time
                          </label>
                          <input
                            id={`segment-end-${index}`}
                            type="number"
                            step="0.1"
                            value={segment.end}
                            onChange={(e) =>
                              updateSegment(
                                index,
                                "end",
                                Number(e.target.value),
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor={`segment-text-${index}`}
                          className="block text-xs text-gray-600 mb-1"
                        >
                          Caption Text
                        </label>
                        <textarea
                          id={`segment-text-${index}`}
                          value={segment.text}
                          onChange={(e) =>
                            updateSegment(index, "text", e.target.value)
                          }
                          placeholder="Enter caption text..."
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
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
                    isLoading
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save Captions"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
