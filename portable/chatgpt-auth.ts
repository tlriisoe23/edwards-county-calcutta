import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSession, safeReturn } from './sessions.mjs';
export type ChatGPTUser = { userId: string; displayName: string; email: string; fullName: string | null };
export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const session = readSession((await cookies()).get('calcutta_session')?.value);
  return session?.kind === 'user' ? session.user : null;
}
export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(chatGPTSignInPath(returnTo));
}
export function chatGPTSignInPath(returnTo: string) { return '/signin-with-chatgpt?return_to=' + encodeURIComponent(safeReturn(returnTo)); }
export function chatGPTSignOutPath(returnTo = '/') { return '/signout-with-chatgpt?return_to=' + encodeURIComponent(safeReturn(returnTo)); }
