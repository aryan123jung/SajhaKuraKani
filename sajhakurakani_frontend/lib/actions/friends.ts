"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
} from "../api/friends";
import { assertValidCsrfToken } from "../csrf";

const getSafeRedirectTarget = (value: FormDataEntryValue | null) => {
  const redirectTo = typeof value === "string" ? value : "";
  return redirectTo.startsWith("/user/friends") ? redirectTo : "/user/friends";
};

const redirectWithMessage = (
  basePath: string,
  key: "notice" | "error",
  value: string
) => {
  const url = new URL(basePath, "https://localhost");
  url.searchParams.set(key, value);
  redirect(`${url.pathname}${url.search}`);
};

export async function sendFriendRequestAction(formData: FormData) {
  const redirectTo = getSafeRedirectTarget(formData.get("redirectTo"));

  try {
    await assertValidCsrfToken(formData);
    await sendFriendRequest(String(formData.get("recipientUserId") || ""));
    revalidatePath("/user/friends");
    redirectWithMessage(redirectTo, "notice", "Friend request sent.");
  } catch (error) {
    redirectWithMessage(
      redirectTo,
      "error",
      error instanceof Error ? error.message : "Unable to send that friend request right now."
    );
  }
}

export async function acceptFriendRequestAction(formData: FormData) {
  const redirectTo = getSafeRedirectTarget(formData.get("redirectTo"));

  try {
    await assertValidCsrfToken(formData);
    await acceptFriendRequest(String(formData.get("requestId") || ""));
    revalidatePath("/user/friends");
    redirectWithMessage(redirectTo, "notice", "Friend request accepted.");
  } catch (error) {
    redirectWithMessage(
      redirectTo,
      "error",
      error instanceof Error ? error.message : "Unable to accept that request right now."
    );
  }
}

export async function rejectFriendRequestAction(formData: FormData) {
  const redirectTo = getSafeRedirectTarget(formData.get("redirectTo"));

  try {
    await assertValidCsrfToken(formData);
    await rejectFriendRequest(String(formData.get("requestId") || ""));
    revalidatePath("/user/friends");
    redirectWithMessage(redirectTo, "notice", "Friend request declined.");
  } catch (error) {
    redirectWithMessage(
      redirectTo,
      "error",
      error instanceof Error ? error.message : "Unable to reject that request right now."
    );
  }
}

export async function cancelFriendRequestAction(formData: FormData) {
  const redirectTo = getSafeRedirectTarget(formData.get("redirectTo"));

  try {
    await assertValidCsrfToken(formData);
    await cancelFriendRequest(String(formData.get("requestId") || ""));
    revalidatePath("/user/friends");
    redirectWithMessage(redirectTo, "notice", "Pending request cancelled.");
  } catch (error) {
    redirectWithMessage(
      redirectTo,
      "error",
      error instanceof Error ? error.message : "Unable to cancel that request right now."
    );
  }
}

export async function removeFriendAction(formData: FormData) {
  const redirectTo = getSafeRedirectTarget(formData.get("redirectTo"));

  try {
    await assertValidCsrfToken(formData);
    await removeFriend(String(formData.get("friendUserId") || ""));
    revalidatePath("/user/friends");
    redirectWithMessage(redirectTo, "notice", "Friend removed.");
  } catch (error) {
    redirectWithMessage(
      redirectTo,
      "error",
      error instanceof Error ? error.message : "Unable to remove that friend right now."
    );
  }
}
