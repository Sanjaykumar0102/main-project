import NextAuth from "next-auth"
import authConfig from "./auth.config"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "./lib/mongodb"

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: MongoDBAdapter(clientPromise),
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    debug: true,
    trustHost: true,
    ...authConfig,
    allowDangerousEmailAccountLinking: true,
})
