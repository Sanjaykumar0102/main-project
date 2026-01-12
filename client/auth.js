import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"

import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "./lib/mongodb"

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: MongoDBAdapter(clientPromise),
    debug: true, // Enable for production troubleshooting
    trustHost: true,
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
                        return null;
                    }

                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://main-project-97o4.onrender.com";
                    console.log(`[AUTH] Attempting login to: ${apiUrl}/api/auth/login`);

                    const res = await fetch(`${apiUrl}/api/auth/login`, {
                        method: "POST",
                        body: JSON.stringify(credentials),
                        headers: { "Content-Type": "application/json" },
                    });

                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        console.error(`[AUTH] Login failed with status ${res.status}:`, errorData.message);
                        return null;
                    }

                    const user = await res.json();

                    if (user) {
                        // Ensure NextAuth sees an 'id' string
                        return {
                            ...user,
                            id: user._id || user.id,
                        };
                    }

                    return null;
                } catch (e) {
                    console.error("[AUTH] Unexpected error during authorize:", e);
                    return null;
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
