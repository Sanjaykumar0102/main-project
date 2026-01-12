import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"

export default {
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        GitHub({
            clientId: process.env.AUTH_GITHUB_ID || process.env.GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET || process.env.GITHUB_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),

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
        async signIn({ user, account, profile }) {
            return true;
        },
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id || user._id;
                token.role = user.role || 'user';
                token.accessToken = user.token;

                if (account && (account.provider === "google" || account.provider === "github")) {
                    try {
                        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://main-project-97o4.onrender.com";
                        console.log(`[AUTH] JWT Callback -> Syncing OAuth user: ${user.email}`);

                        const res = await fetch(`${apiUrl}/api/auth/oauth-login`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: user.email, name: user.name })
                        });

                        if (res.ok) {
                            const data = await res.json();
                            console.log(`[AUTH] JWT Sync Success: Role=${data.role}`);
                            token.accessToken = data.token;
                            token.role = data.role;
                            token.id = data._id;
                        } else {
                            console.error(`[AUTH] JWT Sync Refused: ${res.status}`);
                        }
                    } catch (e) {
                        console.error("[AUTH] JWT Sync Fatal Error:", e.message);
                    }
                }
                console.log(`[AUTH] Token ready for User ${token.id}. Has Token: ${!!token.accessToken}`);
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.role = token.role || 'user';
                session.user.token = token.accessToken;
                console.log(`[AUTH] Session ready for ${session.user.email}. Role: ${session.user.role}, Has Token: ${!!session.user.token}`);
            }
            return session;
        },
    },
}
