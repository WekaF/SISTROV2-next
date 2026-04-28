import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const ASPNET_API_URL = process.env.ASPNET_API_URL || "http://localhost:5000";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username:    { label: "Username", type: "text" },
        password:    { label: "Password", type: "password" },
        companycode: { label: "Company Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Username dan password wajib diisi");
        }

        const params = new URLSearchParams({
          grant_type: "password",
          username:   credentials.username,
          password:   credentials.password,
        });
        if (credentials.companycode) {
          params.append("companycode", credentials.companycode);
        }

        let data: any;
        try {
          const res = await fetch(`${ASPNET_API_URL}/Token`, {
            method:  "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body:    params.toString(),
          });

          if (!res.ok) {
            const text = await res.text().catch(() => res.statusText);
            let errMsg = "Login gagal";
            try { errMsg = JSON.parse(text)?.error_description || text || errMsg; } catch {}
            throw new Error(errMsg);
          }
          data = await res.json();
        } catch (err: any) {
          throw new Error(err?.message || "Tidak dapat terhubung ke server");
        }

        const roles: string[] = data.role
          ? data.role.split(", ").map((r: string) => r.trim().toLowerCase())
          : [];

        return {
          id:            data.userid,
          name:          data.fullname,
          email:         data.email,
          role:          roles[0] ?? "viewer",
          roles,
          companyCode:   data.companycode ?? null,
          aspnetToken:   data.access_token,
          username:      data.username,
          transportCode: data.transportcode ?? null,
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role          = (user as any).role;
        token.roles         = (user as any).roles;
        token.id            = (user as any).id;
        token.companyCode   = (user as any).companyCode;
        token.aspnetToken   = (user as any).aspnetToken;
        token.username      = (user as any).username;
        token.transportCode = (user as any).transportCode;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role          = token.role;
        (session.user as any).roles         = token.roles;
        (session.user as any).id            = token.id;
        (session.user as any).companyCode   = token.companyCode;
        (session.user as any).aspnetToken   = token.aspnetToken;
        (session.user as any).username      = token.username;
        (session.user as any).transportCode = token.transportCode;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
