export type UpdateProfileActionState = {
  success: boolean;
  message: string;
  fields: {
    firstName: string;
    lastName: string;
    username: string;
    bio: string;
  };
};

export const initialUpdateProfileActionState: UpdateProfileActionState = {
  success: false,
  message: "",
  fields: {
    firstName: "",
    lastName: "",
    username: "",
    bio: "",
  },
};
