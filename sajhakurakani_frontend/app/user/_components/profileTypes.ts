export type ProfileViewUser = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  profileUrl?: string | null;
  coverUrl?: string | null;
  createdAt?: string;
} | null;

export type ProfilePost = {
  id: string;
  title: string;
  body: string;
  meta: string;
  visibility: "public" | "private" | "friends-only";
  mediaCount: number;
};
