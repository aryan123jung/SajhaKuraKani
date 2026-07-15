export type LoginActionState = {
  success: boolean;
  message: string;
  requiresTotp: boolean;
  fields: {
    email: string;
    password: string;
    totpCode: string;
  };
};

export const initialLoginActionState: LoginActionState = {
  success: false,
  message: "",
  requiresTotp: false,
  fields: {
    email: "",
    password: "",
    totpCode: "",
  },
};
