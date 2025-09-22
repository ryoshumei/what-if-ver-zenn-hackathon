"use client";

import { useEffect, useState } from "react";

interface ShareButtonProps {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  className?: string;
}

export default function ShareButton({
  title,
  description,
  url,
  imageUrl: _imageUrl,
  className = "",
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  const shareData = {
    title,
    text: description,
    url,
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error sharing:", error);
        }
      }
    } else {
      setIsOpen(true);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const shareLinks = [
    {
      name: "Twitter",
      icon: "🐦",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} - ${description}`)}&url=${encodeURIComponent(url)}`,
    },
    {
      name: "Facebook",
      icon: "📘",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      name: "LinkedIn",
      icon: "💼",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
      name: "Reddit",
      icon: "🤖",
      url: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    },
    {
      name: "WhatsApp",
      icon: "💬",
      url: `https://wa.me/?text=${encodeURIComponent(`${title} - ${description} ${url}`)}`,
    },
    {
      name: "Telegram",
      icon: "✈️",
      url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`${title} - ${description}`)}`,
    },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleNativeShare}
        className={`flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors ${className}`}
      >
        <span>📤</span>
        <span className="text-sm font-medium">Share</span>
      </button>

      {/* Share Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Share Menu */}
          <div className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Share this creation
              </h4>

              {/* Copy Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg text-left"
              >
                <span className="text-lg">🔗</span>
                <div className="flex-1">
                  <div className="font-medium text-sm">Copy Link</div>
                  <div className="text-xs text-gray-600">
                    {copied ? "Copied!" : "Copy direct link to share"}
                  </div>
                </div>
              </button>

              {/* Divider */}
              <div className="border-t border-gray-200 my-3" />

              {/* Social Share Links */}
              <div className="space-y-1">
                {shareLinks.map((platform) => (
                  <a
                    key={platform.name}
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg text-left"
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="text-lg">{platform.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{platform.name}</div>
                    </div>
                  </a>
                ))}
              </div>

              {/* Close Button */}
              <div className="border-t border-gray-200 mt-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
