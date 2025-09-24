"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import ShareButton from "../components/publish/ShareButton";

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

interface CommunityPost {
  id: string;
  generationId: string;
  title: string;
  description: string;
  visibility: "public" | "unlisted";
  allowRefinements: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  likes: number;
  views: number;
  // Related data
  generation?: {
    id: string;
    type: "image" | "video";
    model: string;
    asset?: MediaAsset;
  };
}

export default function FeedPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "trending">(
    "newest",
  );
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">(
    "all",
  );

  const loadPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/feed?sort=${sortBy}`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error("Failed to load posts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sortBy]);

  // Load posts from API
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach((post) => {
      post.tags.forEach((tag) => {
        tagSet.add(tag);
      });
    });
    return Array.from(tagSet).sort();
  }, [posts]);

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !post.title.toLowerCase().includes(query) &&
          !post.description.toLowerCase().includes(query) &&
          !post.tags.some((tag) => tag.toLowerCase().includes(query))
        ) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== "all" && post.generation?.type !== typeFilter) {
        return false;
      }

      // Tag filter
      if (selectedTags.length > 0) {
        if (!selectedTags.some((tag) => post.tags.includes(tag))) {
          return false;
        }
      }

      return true;
    });
  }, [posts, searchQuery, typeFilter, selectedTags]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleLike = async (postId: string) => {
    try {
      const response = await fetch(`/api/feed/${postId}/like`, {
        method: "POST",
      });

      if (response.ok) {
        // Update local state
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId ? { ...post, likes: post.likes + 1 } : post,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to like post:", error);
    }
  };

  const renderAsset = (post: CommunityPost) => {
    if (!post.generation?.asset) {
      return (
        <div className="w-full h-64 bg-gray-100 rounded-t-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">
              {post.generation?.type === "image" ? "🖼️" : "🎬"}
            </div>
            <p className="text-sm">Asset not available</p>
          </div>
        </div>
      );
    }

    const { asset } = post.generation;

    if (post.generation.type === "image") {
      return (
        <Image
          src={asset.url}
          alt={asset.altText || post.title}
          width={asset.width || 400}
          height={asset.height || 300}
          className="w-full h-64 object-cover rounded-t-lg"
          unoptimized
        />
      );
    }

    if (post.generation.type === "video") {
      return (
        <video
          src={asset.url}
          width={asset.width || 400}
          height={asset.height || 300}
          controls
          className="w-full h-64 object-cover rounded-t-lg"
          poster={asset.url.replace(".mp4", "_thumbnail.jpg")}
          muted
          preload="metadata"
        >
          <track
            kind="captions"
            src={asset.captions || ""}
            srcLang="en"
            label="English"
            default={!!asset.captions}
          />
        </video>
      );
    }

    return null;
  };

  const getShareUrl = (post: CommunityPost) => {
    return `${window.location.origin}/feed/${post.id}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Community Feed
              </h1>
              <p className="text-gray-600 mt-1">
                Discover amazing "what if" creations from the community
              </p>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Your Own
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search posts, descriptions, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "newest" | "popular" | "trending")
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest</option>
              <option value="popular">Most Popular</option>
              <option value="trending">Trending</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as "all" | "image" | "video")
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
            </select>

            {/* Clear Filters */}
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedTags([]);
                setTypeFilter("all");
              }}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Clear All
            </button>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="mt-4">
              <div className="block text-sm font-medium text-gray-700 mb-2">
                Popular Tags
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.slice(0, 15).map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedTags.includes(tag)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Info */}
        <div className="mb-6">
          <p className="text-gray-600">
            {isLoading ? "Loading..." : `${filteredPosts.length} posts found`}
            {selectedTags.length > 0 && (
              <span className="ml-2">
                filtered by: {selectedTags.map((tag) => `#${tag}`).join(", ")}
              </span>
            )}
          </p>
        </div>

        {/* Posts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={`skeleton-${Date.now()}-${i}`}
                className="bg-white rounded-lg shadow-sm animate-pulse"
              >
                <div className="w-full h-64 bg-gray-200 rounded-t-lg" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No posts found
            </h3>
            <p className="text-gray-600 mb-6">
              {posts.length === 0
                ? "The community hasn't shared any creations yet. Be the first!"
                : "Try adjusting your search or filter criteria."}
            </p>
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Something Amazing
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Asset */}
                <div className="relative">
                  {renderAsset(post)}

                  {/* Type Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                      {post.generation?.type === "image"
                        ? "🖼️ Image"
                        : "🎬 Video"}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {post.title}
                  </h3>

                  <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                    {post.description}
                  </p>

                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                      {post.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded-full">
                          +{post.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-3">
                      <span>👁️ {post.views}</span>
                      <span>❤️ {post.likes}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleLike(post.id)}
                        className="flex items-center space-x-1 px-3 py-1 text-gray-600 hover:text-red-600 rounded-lg hover:bg-gray-50"
                      >
                        <span>❤️</span>
                        <span className="text-sm">Like</span>
                      </button>

                      {post.allowRefinements && (
                        <button
                          type="button"
                          className="flex items-center space-x-1 px-3 py-1 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-gray-50"
                        >
                          <span>🔄</span>
                          <span className="text-sm">Refine</span>
                        </button>
                      )}
                    </div>

                    <ShareButton
                      title={post.title}
                      description={post.description}
                      url={getShareUrl(post)}
                      imageUrl={post.generation?.asset?.url}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {!isLoading &&
          filteredPosts.length > 0 &&
          filteredPosts.length >= 12 && (
            <div className="text-center mt-8">
              <button
                type="button"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Load More Posts
              </button>
            </div>
          )}
      </div>
    </div>
  );
}
