# Data Model — What If Visualizer

Source: `/specs/001-hackathon-ai-agent/spec.md`

## Entities

### User
- id: string (uid)
- displayName: string
- photoURL: string | null
- locale: 'en' | 'zh-CN' | 'ja'
- createdAt: timestamp

### IdeaPrompt
- id: string
- authorId: string (User.id)
- text: string
- language: 'en' | 'zh-CN' | 'ja' | 'unknown'
- tags: string[]
- createdAt: timestamp
- updatedAt: timestamp

Validation:
- text is non-empty; length <= 2,000 chars

### Generation
- id: string
- promptId: string (IdeaPrompt.id)
- type: 'image' | 'video'
- status: 'queued' | 'running' | 'complete' | 'failed'
- model: string
- refinementOf: string | null (Generation.id)
- alignmentFeedback: { matchesIntent: boolean | null; note: string | null }
- createdAt: timestamp
- updatedAt: timestamp

### MediaAsset
- id: string
- generationId: string (Generation.id)
- url: string (public or signed)
- storagePath: string (gs://...)
- format: string (e.g., 'png', 'mp4')
- width: number | null
- height: number | null
- durationSec: number | null
- altText: string | null
- captions: string | null
- visibility: 'private' | 'unlisted' | 'public'
- createdAt: timestamp

### PolicyFlag
- id: string
- targetType: 'prompt' | 'generation'
- targetId: string
- reason: string
- severity: 'low' | 'medium' | 'high'
- resolution: 'blocked' | 'allowed' | 'needs_review'
- createdAt: timestamp

### CommunityPost
- id: string
- generationId: string (Generation.id)
- authorId: string (User.id)
- promptSummary: string
- thumbnailUrl: string
- publishedAt: timestamp
- visibility: 'public'

## Relationships
- User 1—N IdeaPrompt
- IdeaPrompt 1—N Generation
- Generation 1—1..N MediaAsset
- Generation 0..N PolicyFlag
- CommunityPost references a single Generation

## State Transitions (Generation)
- queued → running → complete | failed
- On complete: MediaAsset created; thumbnails generated
- On failed: error reason recorded (out of scope for public API)

## Indexing (Firestore guidance)
- IdeaPrompt: authorId+createdAt
- Generation: promptId+createdAt, status
- CommunityPost: publishedAt desc


