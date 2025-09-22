import {
  addDoc,
  collection,
  type DocumentSnapshot,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/client";
import { getAdminFirestore } from "../firebase/server";
import type {
  CommunityPost,
  CommunityPostWithDetails,
  CreateCommunityPost,
  FeedQuery,
  FeedResponse,
} from "../models/CommunityPost";
import type {
  CreateGeneration,
  Generation,
  UpdateGeneration,
} from "../models/Generation";
import type { CreateIdeaPrompt, IdeaPrompt } from "../models/IdeaPrompt";
import type { CreatePolicyFlag, PolicyFlag } from "../models/PolicyFlag";
import type { CreateUser, UpdateUser, User } from "../models/User";

export interface PaginationOptions {
  pageSize?: number;
  startAfter?: DocumentSnapshot;
}

export class FirestoreRepository {
  private isServer: boolean;

  constructor(isServer = false) {
    this.isServer = isServer;
  }

  private get firestore() {
    return this.isServer ? getAdminFirestore() : db;
  }

  // Helper to convert Firestore timestamp to Date
  private convertTimestamps<T>(data: Record<string, unknown>): T {
    const converted = { ...data };

    Object.keys(converted).forEach((key) => {
      if (converted[key] instanceof Timestamp) {
        converted[key] = converted[key].toDate();
      }
    });

    return converted as T;
  }

  // User operations
  async getUser(id: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(this.firestore as never, "users", id));
      if (!userDoc.exists()) return null;

      return this.convertTimestamps({ id: userDoc.id, ...userDoc.data() });
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  }

  async createUser(userData: CreateUser): Promise<User> {
    try {
      const now = new Date();
      const docRef = await addDoc(
        collection(this.firestore as never, "users"),
        {
          ...userData,
          createdAt: now,
        },
      );

      return {
        id: docRef.id,
        ...userData,
        createdAt: now,
      };
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: string, updates: UpdateUser): Promise<void> {
    try {
      await updateDoc(doc(this.firestore as never, "users", id), updates);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  // IdeaPrompt operations
  async getIdeaPrompt(id: string): Promise<IdeaPrompt | null> {
    try {
      const promptDoc = await getDoc(
        doc(this.firestore as never, "ideaPrompts", id),
      );
      if (!promptDoc.exists()) return null;

      return this.convertTimestamps({ id: promptDoc.id, ...promptDoc.data() });
    } catch (error) {
      console.error("Error getting idea prompt:", error);
      throw error;
    }
  }

  async createIdeaPrompt(promptData: CreateIdeaPrompt): Promise<IdeaPrompt> {
    try {
      const now = new Date();
      const docRef = await addDoc(
        collection(this.firestore as never, "ideaPrompts"),
        {
          ...promptData,
          createdAt: now,
          updatedAt: now,
        },
      );

      return {
        id: docRef.id,
        ...promptData,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      console.error("Error creating idea prompt:", error);
      throw error;
    }
  }

  async getUserPrompts(
    authorId: string,
    options: PaginationOptions = {},
  ): Promise<IdeaPrompt[]> {
    try {
      const pageSize = options.pageSize || 20;

      let q = query(
        collection(this.firestore as never, "ideaPrompts"),
        where("authorId", "==", authorId),
        orderBy("createdAt", "desc"),
        limit(pageSize),
      );

      if (options.startAfter) {
        q = query(q, startAfter(options.startAfter));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) =>
        this.convertTimestamps({ id: doc.id, ...doc.data() }),
      );
    } catch (error) {
      console.error("Error getting user prompts:", error);
      throw error;
    }
  }

  // Generation operations
  async getGeneration(id: string): Promise<Generation | null> {
    try {
      const genDoc = await getDoc(
        doc(this.firestore as never, "generations", id),
      );
      if (!genDoc.exists()) return null;

      return this.convertTimestamps({ id: genDoc.id, ...genDoc.data() });
    } catch (error) {
      console.error("Error getting generation:", error);
      throw error;
    }
  }

  async createGeneration(
    generationData: CreateGeneration,
  ): Promise<Generation> {
    try {
      const now = new Date();
      const docRef = await addDoc(
        collection(this.firestore as never, "generations"),
        {
          ...generationData,
          createdAt: now,
          updatedAt: now,
          error: null,
        },
      );

      return {
        id: docRef.id,
        ...generationData,
        createdAt: now,
        updatedAt: now,
        error: null,
      };
    } catch (error) {
      console.error("Error creating generation:", error);
      throw error;
    }
  }

  async updateGeneration(id: string, updates: UpdateGeneration): Promise<void> {
    try {
      await updateDoc(doc(this.firestore as never, "generations", id), {
        ...updates,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error updating generation:", error);
      throw error;
    }
  }

  async getGenerationsByPrompt(promptId: string): Promise<Generation[]> {
    try {
      const q = query(
        collection(this.firestore as never, "generations"),
        where("promptId", "==", promptId),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) =>
        this.convertTimestamps({ id: doc.id, ...doc.data() }),
      );
    } catch (error) {
      console.error("Error getting generations by prompt:", error);
      throw error;
    }
  }

  async getGenerationsByStatus(
    status: Generation["status"],
  ): Promise<Generation[]> {
    try {
      const q = query(
        collection(this.firestore as never, "generations"),
        where("status", "==", status),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) =>
        this.convertTimestamps({ id: doc.id, ...doc.data() }),
      );
    } catch (error) {
      console.error("Error getting generations by status:", error);
      throw error;
    }
  }

  // Community Post operations
  async getCommunityPost(id: string): Promise<CommunityPost | null> {
    try {
      const postDoc = await getDoc(
        doc(this.firestore as never, "communityPosts", id),
      );
      if (!postDoc.exists()) return null;

      return this.convertTimestamps({ id: postDoc.id, ...postDoc.data() });
    } catch (error) {
      console.error("Error getting community post:", error);
      throw error;
    }
  }

  async createCommunityPost(
    postData: CreateCommunityPost,
  ): Promise<CommunityPost> {
    try {
      const now = new Date();
      const docRef = await addDoc(
        collection(this.firestore as never, "communityPosts"),
        {
          ...postData,
          publishedAt: now,
        },
      );

      return {
        id: docRef.id,
        ...postData,
        publishedAt: now,
      };
    } catch (error) {
      console.error("Error creating community post:", error);
      throw error;
    }
  }

  async getFeed(feedQuery: FeedQuery): Promise<FeedResponse> {
    try {
      const pageSize = feedQuery.pageSize || 12;

      let q = query(
        collection(this.firestore as never, "communityPosts"),
        where("visibility", "==", "public"),
        orderBy("publishedAt", "desc"),
        limit(pageSize + 1), // Get one extra to check if there's a next page
      );

      // Add search filter if provided
      if (feedQuery.q) {
        // Simple text search - in production, you'd want full-text search
        q = query(q, where("promptSummary", ">=", feedQuery.q));
        q = query(q, where("promptSummary", "<=", `${feedQuery.q}\uf8ff`));
      }

      // Add author filter if provided
      if (feedQuery.authorId) {
        q = query(q, where("authorId", "==", feedQuery.authorId));
      }

      const snapshot = await getDocs(q);
      const allPosts = snapshot.docs.map((doc) =>
        this.convertTimestamps<CommunityPostWithDetails>({
          id: doc.id,
          ...doc.data(),
        }),
      );

      // Check if there's a next page
      const hasNextPage = allPosts.length > pageSize;
      const items = hasNextPage ? allPosts.slice(0, pageSize) : allPosts;
      const nextPage = hasNextPage ? (feedQuery.page || 1) + 1 : null;

      return {
        items,
        nextPage,
      };
    } catch (error) {
      console.error("Error getting feed:", error);
      throw error;
    }
  }

  // Policy Flag operations
  async createPolicyFlag(flagData: CreatePolicyFlag): Promise<PolicyFlag> {
    try {
      const now = new Date();
      const docRef = await addDoc(
        collection(this.firestore as never, "policyFlags"),
        {
          ...flagData,
          createdAt: now,
        },
      );

      return {
        id: docRef.id,
        ...flagData,
        createdAt: now,
      };
    } catch (error) {
      console.error("Error creating policy flag:", error);
      throw error;
    }
  }

  async getPolicyFlags(
    targetType: PolicyFlag["targetType"],
    targetId: string,
  ): Promise<PolicyFlag[]> {
    try {
      const q = query(
        collection(this.firestore as never, "policyFlags"),
        where("targetType", "==", targetType),
        where("targetId", "==", targetId),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) =>
        this.convertTimestamps({ id: doc.id, ...doc.data() }),
      );
    } catch (error) {
      console.error("Error getting policy flags:", error);
      throw error;
    }
  }

  // Batch operations for feedback
  async recordAlignmentFeedback(
    generationId: string,
    matchesIntent: boolean,
    note?: string,
  ): Promise<void> {
    try {
      await updateDoc(
        doc(this.firestore as never, "generations", generationId),
        {
          alignmentFeedback: {
            matchesIntent,
            note: note || null,
          },
          updatedAt: new Date(),
        },
      );
    } catch (error) {
      console.error("Error recording alignment feedback:", error);
      throw error;
    }
  }
}

// Export singleton instances for both client and server
export const clientFirestore = new FirestoreRepository(false);
export const serverFirestore = new FirestoreRepository(true);
