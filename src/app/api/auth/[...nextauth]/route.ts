import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username / Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Missing username or password");
        }

        try {
          const result = await query<{
            id: string;
            username: string;
            fullname: string;
            email: string;
            passwordhash: string;
            sapvendorcode: string;
            bagian: string;
            department: string;
            isactive: boolean;
            roles: string[];
          }>(`
            SELECT
              u.id,
              u.username,
              u.fullname,
              u.email,
              u.passwordhash,
              u.sapvendorcode,
              u.bagian,
              u.department,
              u.isactive,
              COALESCE(
                ARRAY_AGG(r.code) FILTER (WHERE r.code IS NOT NULL),
                ARRAY[]::varchar[]
              ) AS roles
            FROM users u
            LEFT JOIN userroles  ur ON ur.userid = u.id
            LEFT JOIN roles      r  ON r.id = ur.roleid
            WHERE u.username = $1 OR u.email = $1
            GROUP BY u.id
          `, [credentials.username]);

          const user = result.rows[0];

          if (!user) {
            throw new Error("Username atau password salah");
          }

          if (!user.isactive) {
            throw new Error("Akun tidak aktif, hubungi administrator");
          }

          const isValid = await bcrypt.compare(credentials.password, user.passwordhash);
          if (!isValid) {
            throw new Error("Username atau password salah");
          }

          const roles: string[] = user.roles?.length ? user.roles : ["viewer"];

          // kompanies dari UserCompanies (multi-company support)
          const compRes = await query<{ companycode: string }>(
            `SELECT companycode FROM usercompanies WHERE userid = $1 LIMIT 1`,
            [user.id]
          );
          const companyCode = compRes.rows[0]?.companycode || user.sapvendorcode || null;

          return {
            id: String(user.id),
            name: user.fullname || user.username,
            email: user.email,
            role: roles[0],
            roles,
            companyCode,
            bagian: user.bagian || null,
            department: user.department || null,
          };
        } catch (error) {
          console.error("Auth error:", error);
          throw error;
        }
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role       = (user as any).role;
        token.roles      = (user as any).roles;
        token.id         = (user as any).id;
        token.companyCode= (user as any).companyCode;
        token.bagian     = (user as any).bagian;
        token.department = (user as any).department;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role       = token.role;
        (session.user as any).roles      = token.roles;
        (session.user as any).id         = token.id;
        (session.user as any).companyCode= token.companyCode;
        (session.user as any).bagian     = token.bagian;
        (session.user as any).department = token.department;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || "SUPER_SECRET_CHANGE_ME_LATER"
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
