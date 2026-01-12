import NextAuth from "next-auth"
import authConfig from "./auth.config"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
    // Middleware logic if needed, otherwise it just protects routes
})

export const config = {
    matcher: ["/dashboard/:path*"],
}
