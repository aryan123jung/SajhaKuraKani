import type { PostMedia } from "@/lib/api/posts";

export type ProfileViewUser = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string | null;
  profileUrl?: string | null;
  coverUrl?: string | null;
  createdAt?: string;
} | null;

export type ProfilePost = {
  id: string;
  authorId: string;
  title: string;
  body: string;
  meta: string;
  visibility: "public" | "private" | "friends-only";
  liked: boolean;
  likeCount: number;
  commentCount: number | null;
  commentsAvailable: boolean;
  canComment: boolean;
  media: PostMedia[];
  mediaCount: number;
};
