import { identity } from "@/lib/store";
import { requireChatGPTUser } from "../chatgpt-auth";
import Auction from "../auction";
export const dynamic = "force-dynamic";
export default async function Admin() { await requireChatGPTUser("/admin"); const who = await identity(); if (!who?.operator)
    return <main className="access-screen"><h1>Operator access required</h1><p>Your ChatGPT account is signed in, but it has not been granted access to this auction.</p><a href="/">Return to the public board</a></main>; return <Auction admin user={{ email: who.email, owner: who.owner }}/>; }
