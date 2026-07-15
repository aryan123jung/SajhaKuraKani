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

export type GoogleTotpActionState = {
  success: boolean;
  message: string;
  code: string;
};

export const initialGoogleTotpActionState: GoogleTotpActionState = {
  success: false,
  message: "",
  code: "",
};

export type TotpSetupActionState = {
  success: boolean;
  message: string;
  manualEntryKey: string;
  otpAuthUrl: string;
};

export const initialTotpSetupActionState: TotpSetupActionState = {
  success: false,
  message: "",
  manualEntryKey: "",
  otpAuthUrl: "",
};

export type TotpCodeActionState = {
  success: boolean;
  message: string;
  code: string;
};

export const initialTotpCodeActionState: TotpCodeActionState = {
  success: false,
  message: "",
  code: "",
};
