import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"

import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "./lib/mongodb"

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: MongoDBAdapter(clientPromise),
    providers: [
        Google,
        GitHub,

        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                try {
                    if (!credentials?.email || !credentials?.password) {
                        console.log("Authorize: Missing credentials");
                        return null;
                    }

                    console.log("Authorize: Fetching", `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`);
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
                        method: "POST",
                        body: JSON.stringify(credentials),
                        headers: { "Content-Type": "application/json" },
                    });

                    console.log("Authorize: Response status", res.status);
                    const user = await res.json();
                    console.log("Authorize: User data", user);

                    if (res.ok && user) {
                        return user;
                    }
                    console.log("Authorize: Failed with status or no user");
                    return null;
                } catch (e) {
                    console.error("Authorize: Error", e);
                    return null
                }
            },
        }),
    ],
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id || user._id;
                token.role = user.role || 'user';
                token.accessToken = user.token; // Persist backend token from login response
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.token = token.accessToken; // Pass to client session
            }
            return session;

        },
    },
    // Allow linking accounts with same email
    allowDangerousEmailAccountLinking: true,
})
