import type { PostVisibility } from "../api/posts";

export type UpdatePostActionState = {
  success: boolean;
  message: string;
  activePostId: string;
  fields: {
    title: string;
    content: string;
    visibility: PostVisibility;
  };
};

export const initialUpdatePostActionState: UpdatePostActionState = {
  success: false,
  message: "",
  activePostId: "",
  fields: {
    title: "",
    content: "",
    visibility: "public",
  },
};

export type DeletePostActionState = {
  success: boolean;
  message: string;
  activePostId: string;
};

export const initialDeletePostActionState: DeletePostActionState = {
  success: false,
  message: "",
  activePostId: "",
};
