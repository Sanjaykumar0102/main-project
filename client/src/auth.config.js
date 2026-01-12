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
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id || user._id;
                token.role = user.role || 'user';
                token.accessToken = user.token;
                console.log(`[AUTH] JWT Callback: User ${token.id} (${token.role})`);
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.role = token.role || 'user';
                session.user.token = token.accessToken;
            }
            return session;
        },
    },
}
