"use client";

import { getClientAuth } from "./firebase-client";

export async function authedFetch(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  const user = getClientAuth().currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
