export type ProfileViewUser = {
  firstName?: string;
  lastName?: string;
  profileUrl?: string | null;
  coverUrl?: string | null;
  createdAt?: string;
} | null;

export type ProfilePost = {
  title: string;
  body: string;
  meta: string;
};
