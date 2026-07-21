"use server";

import { revalidatePath } from "next/cache";
import { updateCurrentUserProfile } from "../api/auth";
import { assertValidCsrfToken } from "../csrf";
import type { UpdateProfileActionState } from "./profile-state";

const normalizeField = (value: FormDataEntryValue | null) => String(value ?? "").trim();

export async function updateProfileAction(
  previousState: UpdateProfileActionState,
  formData: FormData
): Promise<UpdateProfileActionState> {
  try {
    await assertValidCsrfToken(formData);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Your session security check failed. Refresh and try again.",
      fields: {
        firstName: normalizeField(formData.get("firstName")),
        lastName: normalizeField(formData.get("lastName")),
        username: normalizeField(formData.get("username")),
        bio: normalizeField(formData.get("bio")),
      },
    };
  }

  const firstName = normalizeField(formData.get("firstName"));
  const lastName = normalizeField(formData.get("lastName"));
  const username = normalizeField(formData.get("username")).toLowerCase();
  const bio = normalizeField(formData.get("bio"));

  if (bio.length > 280) {
    return {
      success: false,
      message: "Bio must be 280 characters or fewer.",
      fields: { firstName, lastName, username, bio },
    };
  }
  const normalizedFields = {
    firstName: firstName || previousState.fields.firstName,
    lastName: lastName || previousState.fields.lastName,
    username: username || previousState.fields.username,
    bio,
  };

  const payload = new FormData();
  const profileFile = formData.get("profileUrl");
  const coverFile = formData.get("coverUrl");

  if (
    normalizedFields.firstName &&
    normalizedFields.firstName !== previousState.fields.firstName
  ) {
    payload.set("firstName", normalizedFields.firstName);
  }

  if (
    normalizedFields.lastName &&
    normalizedFields.lastName !== previousState.fields.lastName
  ) {
    payload.set("lastName", normalizedFields.lastName);
  }

  if (
    normalizedFields.username &&
    normalizedFields.username !== previousState.fields.username
  ) {
    payload.set("username", normalizedFields.username);
  }

  if (bio !== previousState.fields.bio) {
    payload.set("bio", bio);
  }

  if (profileFile instanceof File && profileFile.size > 0) {
    payload.set("profileUrl", profileFile);
  }

  if (coverFile instanceof File && coverFile.size > 0) {
    payload.set("coverUrl", coverFile);
  }

  if (Array.from(payload.keys()).length === 0) {
    return {
      success: false,
      message: "No changes to save.",
      fields: normalizedFields,
    };
  }

  try {
    const response = await updateCurrentUserProfile(payload);

    revalidatePath("/user/home");
    revalidatePath("/user/profile");
    revalidatePath(`/user/profile/${response.data._id}`);

    return {
      success: true,
      message: "Profile updated successfully.",
      fields: {
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        username: response.data.username,
        bio: response.data.bio?.trim() || "",
      },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update your profile right now.",
      fields: normalizedFields,
    };
  }
}
