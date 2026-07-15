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

export type RegisterActionState = {
  success: boolean;
  message: string;
  fields: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
};

export const initialRegisterActionState: RegisterActionState = {
  success: false,
  message: "",
  fields: {
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  },
};
