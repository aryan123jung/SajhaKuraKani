export type LoginActionState = {
  success: boolean;
  message: string;
  fields: {
    email: string;
    password: string;
  };
};

export const initialLoginActionState: LoginActionState = {
  success: false,
  message: "",
  fields: {
    email: "",
    password: "",
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

export type VerifyTotpActionState = {
  success: boolean;
  message: string;
  code: string;
};

export const initialVerifyTotpActionState: VerifyTotpActionState = {
  success: false,
  message: "",
  code: "",
};

// Backward-compatible aliases for renamed verification state.
export type GoogleTotpActionState = VerifyTotpActionState;
export const initialGoogleTotpActionState = initialVerifyTotpActionState;

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
