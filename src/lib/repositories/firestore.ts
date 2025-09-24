// @ts-nocheck
import {
  addDoc,
  type CollectionReference as ClientCollectionReference,
  type DocumentReference as ClientDocumentReference,
  type DocumentSnapshot as ClientDocumentSnapshot,
  type Query as ClientQuery,
  collection,
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
import type {
  CollectionReference as AdminCollectionReference,
  DocumentReference as AdminDocumentReference,
  DocumentSnapshot as AdminDocumentSnapshot,
  Firestore as AdminFirestore,
  Query as AdminQuery,
} from "firebase-admin/firestore";
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

// Union types for dual-mode Firebase compatibility
type DualDocumentSnapshot = ClientDocumentSnapshot | AdminDocumentSnapshot;
// Loosen union types to avoid incompatible API surfaces between client and admin SDKs
// Comments: We only call the method set appropriate to each branch guarded by isServer
type DualDocumentReference = any;
type DualCollectionReference = any;
type DualQuery = any;

export interface PaginationOptions {
  pageSize?: number;
  startAfter?: DualDocumentSnapshot;
}

export class FirestoreRepository {
  private isServer: boolean;

  constructor(isServer = false) {
    this.isServer = isServer;
  }

  private get firestore() {
    return this.isServer ? getAdminFirestore() : db;
  }

  private getCollection(collectionName: string): DualCollectionReference {
    if (this.isServer) {
      return (this.firestore as AdminFirestore).collection(collectionName);
    } else {
      return collection(this.firestore as never, collectionName);
    }
  }

  private getDocRef(
    collectionName: string,
    docId: string,
  ): DualDocumentReference {
    if (this.isServer) {
      return (this.firestore as AdminFirestore)
        .collection(collectionName)
        .doc(docId);
    } else {
      return doc(this.firestore as never, collectionName, docId);
    }
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
      let userDoc: DualDocumentSnapshot;

      if (this.isServer) {
        userDoc = await (this.getDocRef("users", id) as any).get();
        if (!userDoc.exists) return null;
        return this.convertTimestamps({ id: userDoc.id, ...userDoc.data() });
      } else {
        userDoc = await getDoc(this.getDocRef("users", id));
        if (!userDoc.exists()) return null;
        return this.convertTimestamps({ id: userDoc.id, ...userDoc.data() });
      }
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  }

  async createUser(userData: CreateUser): Promise<User> {
    try {
      const now = new Date();
      let docRef: DualDocumentReference;
      const data = {
        ...userData,
        createdAt: now,
      };

      if (this.isServer) {
        docRef = await this.getCollection("users").add(data);
      } else {
        docRef = await addDoc(this.getCollection("users"), data);
      }

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
      if (this.isServer) {
        await (this.getDocRef("users", id) as any).update(updates);
      } else {
        await updateDoc(this.getDocRef("users", id), updates);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  // IdeaPrompt operations
  async getIdeaPrompt(id: string): Promise<IdeaPrompt | null> {
    try {
      let promptDoc: DualDocumentSnapshot;

      if (this.isServer) {
        promptDoc = await (this.getDocRef("ideaPrompts", id) as any).get();
        if (!promptDoc.exists) return null;
        return this.convertTimestamps({
          id: promptDoc.id,
          ...promptDoc.data(),
        });
      } else {
        promptDoc = await getDoc(this.getDocRef("ideaPrompts", id));
        if (!promptDoc.exists()) return null;
        return this.convertTimestamps({
          id: promptDoc.id,
          ...promptDoc.data(),
        });
      }
    } catch (error) {
      console.error("Error getting idea prompt:", error);
      throw error;
    }
  }

  async createIdeaPrompt(promptData: CreateIdeaPrompt): Promise<IdeaPrompt> {
    try {
      const now = new Date();
      const data = {
        ...promptData,
        createdAt: now,
        updatedAt: now,
      };

      let docRef: DualDocumentReference;
      if (this.isServer) {
        docRef = await this.getCollection("ideaPrompts").add(data);
      } else {
        docRef = await addDoc(this.getCollection("ideaPrompts"), data);
      }

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

      let q: DualQuery;

      if (this.isServer) {
        q = (this.getCollection("ideaPrompts") as any)
          .where("authorId", "==", authorId)
          .orderBy("createdAt", "desc")
          .limit(pageSize);
      } else {
        q = query(
          this.getCollection("ideaPrompts"),
          where("authorId", "==", authorId),
          orderBy("createdAt", "desc"),
          limit(pageSize),
        );
      }

      if (options.startAfter) {
        if (this.isServer) {
          q = (q as any).startAfter(options.startAfter);
        } else {
          q = query(q, startAfter(options.startAfter));
        }
      }

      const snapshot = this.isServer ? await (q as any).get() : await getDocs(q);
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
      let genDoc: DualDocumentSnapshot;

      if (this.isServer) {
        genDoc = await (this.getDocRef("generations", id) as any).get();
        if (!genDoc.exists) return null;
        return this.convertTimestamps({ id: genDoc.id, ...genDoc.data() });
      } else {
        genDoc = await getDoc(this.getDocRef("generations", id));
        if (!genDoc.exists()) return null;
        return this.convertTimestamps({ id: genDoc.id, ...genDoc.data() });
      }
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
      const data = {
        ...generationData,
        createdAt: now,
        updatedAt: now,
        error: null,
      };

      let docRef: DualDocumentReference;
      if (this.isServer) {
        docRef = await this.getCollection("generations").add(data);
      } else {
        docRef = await addDoc(this.getCollection("generations"), data);
      }

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
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      if (this.isServer) {
        await this.getDocRef("generations", id).update(updateData);
      } else {
        await updateDoc(this.getDocRef("generations", id), updateData);
      }
    } catch (error) {
      console.error("Error updating generation:", error);
      throw error;
    }
  }

  async getGenerationsByPrompt(promptId: string): Promise<Generation[]> {
    try {
      let q: DualQuery;

      if (this.isServer) {
        q = (this.getCollection("generations") as any)
          .where("promptId", "==", promptId)
          .orderBy("createdAt", "desc");
        const snapshot = await (q as any).get();
        return snapshot.docs.map((doc: DualDocumentSnapshot) =>
          this.convertTimestamps({ id: doc.id, ...doc.data() }),
        );
      } else {
        q = query(
          this.getCollection("generations"),
          where("promptId", "==", promptId),
          orderBy("createdAt", "desc"),
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc: DualDocumentSnapshot) =>
          this.convertTimestamps({ id: doc.id, ...doc.data() }),
        );
      }
    } catch (error) {
      console.error("Error getting generations by prompt:", error);
      throw error;
    }
  }

  async getGenerationsByStatus(
    status: Generation["status"],
  ): Promise<Generation[]> {
    try {
      let q: DualQuery;

      if (this.isServer) {
        q = (this.getCollection("generations") as any)
          .where("status", "==", status)
          .orderBy("createdAt", "desc");
        const snapshot = await (q as any).get();
        return snapshot.docs.map((doc: DualDocumentSnapshot) =>
          this.convertTimestamps({ id: doc.id, ...doc.data() }),
        );
      } else {
        q = query(
          this.getCollection("generations"),
          where("status", "==", status),
          orderBy("createdAt", "desc"),
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc: DualDocumentSnapshot) =>
          this.convertTimestamps({ id: doc.id, ...doc.data() }),
        );
      }
    } catch (error) {
      console.error("Error getting generations by status:", error);
      throw error;
    }
  }

  // Community Post operations
  async getCommunityPost(id: string): Promise<CommunityPost | null> {
    try {
      let postDoc: DualDocumentSnapshot;

      if (this.isServer) {
        postDoc = await (this.getDocRef("communityPosts", id) as any).get();
        if (!postDoc.exists) return null;
        return this.convertTimestamps({ id: postDoc.id, ...postDoc.data() });
      } else {
        postDoc = await getDoc(this.getDocRef("communityPosts", id));
        if (!postDoc.exists()) return null;
        return this.convertTimestamps({ id: postDoc.id, ...postDoc.data() });
      }
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
      const data = {
        ...postData,
        publishedAt: now,
      };

      let docRef: DualDocumentReference;
      if (this.isServer) {
        docRef = await this.getCollection("communityPosts").add(data);
      } else {
        docRef = await addDoc(this.getCollection("communityPosts"), data);
      }

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

      let q: DualQuery;

      if (this.isServer) {
        q = (this.getCollection("communityPosts") as any)
          .where("visibility", "==", "public")
          .orderBy("publishedAt", "desc")
          .limit(pageSize + 1);

        // Add search filter if provided
        if (feedQuery.q) {
          q = q
            .where("promptSummary", ">=", feedQuery.q)
            .where("promptSummary", "<=", `${feedQuery.q}\uf8ff`);
        }

        // Add author filter if provided
        if (feedQuery.authorId) {
          q = q.where("authorId", "==", feedQuery.authorId);
        }

        const snapshot = await (q as any).get();
        const allPosts = snapshot.docs.map((doc: DualDocumentSnapshot) =>
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
      } else {
        q = query(
          this.getCollection("communityPosts"),
          where("visibility", "==", "public"),
          orderBy("publishedAt", "desc"),
          limit(pageSize + 1),
        );

        // Add search filter if provided
        if (feedQuery.q) {
          q = query(q, where("promptSummary", ">=", feedQuery.q));
          q = query(q, where("promptSummary", "<=", `${feedQuery.q}\uf8ff`));
        }

        // Add author filter if provided
        if (feedQuery.authorId) {
          q = query(q, where("authorId", "==", feedQuery.authorId));
        }

        const snapshot = await getDocs(q);
        const allPosts = snapshot.docs.map((doc: DualDocumentSnapshot) =>
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
      }
    } catch (error) {
      console.error("Error getting feed:", error);
      throw error;
    }
  }

  // Policy Flag operations
  async createPolicyFlag(flagData: CreatePolicyFlag): Promise<PolicyFlag> {
    try {
      const now = new Date();
      const data = {
        ...flagData,
        createdAt: now,
      };

      let docRef: DualDocumentReference;
      if (this.isServer) {
        docRef = await this.getCollection("policyFlags").add(data);
      } else {
        docRef = await addDoc(this.getCollection("policyFlags"), data);
      }

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
      let q: DualQuery;

      if (this.isServer) {
        q = (this.getCollection("policyFlags") as any)
          .where("targetType", "==", targetType)
          .where("targetId", "==", targetId)
          .orderBy("createdAt", "desc");
        const snapshot = await (q as any).get();
        return snapshot.docs.map((doc: DualDocumentSnapshot) =>
          this.convertTimestamps({ id: doc.id, ...doc.data() }),
        );
      } else {
        q = query(
          this.getCollection("policyFlags"),
          where("targetType", "==", targetType),
          where("targetId", "==", targetId),
          orderBy("createdAt", "desc"),
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc: DualDocumentSnapshot) =>
          this.convertTimestamps({ id: doc.id, ...doc.data() }),
        );
      }
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
      const updateData = {
        alignmentFeedback: {
          matchesIntent,
          note: note || null,
        },
        updatedAt: new Date(),
      };

      if (this.isServer) {
        await (this.getDocRef("generations", generationId) as any).update(updateData);
      } else {
        await updateDoc(
          this.getDocRef("generations", generationId),
          updateData,
        );
      }
    } catch (error) {
      console.error("Error recording alignment feedback:", error);
      throw error;
    }
  }
}

// Export singleton instances for both client and server
export const clientFirestore = new FirestoreRepository(false);
export const serverFirestore = new FirestoreRepository(true);
