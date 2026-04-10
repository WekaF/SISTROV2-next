import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDbConnection } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username / NIK / Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Missing username or password");
        }

        try {
          const pool = await getDbConnection();
          // Query returning JSON array of roles using STRING_AGG
          const result = await pool.request()
            .input("username", credentials.username)
            .query(`
              SELECT u.*, 
                (SELECT '[' + STRING_AGG('"' + r.Code + '"', ',') + ']'
                 FROM UserRoles ur 
                 JOIN Roles r ON ur.RoleId = r.Id 
                 WHERE ur.UserId = u.Id) as RolesJson
              FROM Users u
              WHERE (u.UserName = @username OR u.Email = @username)
            `);

          const userRecord = result.recordset[0];

          if (!userRecord) {
            throw new Error("Invalid credentials");
          }

          if (!userRecord.IsActive) {
            throw new Error("Account is inactive");
          }

          const isValid = await bcrypt.compare(credentials.password, userRecord.PasswordHash);
          
          if (!isValid) {
            throw new Error("Invalid password");
          }

          let roles = JSON.parse(userRecord.RolesJson || '["viewer"]');

          // Auto-detection for SISTRO_ prefix (Rekanan)
          if (userRecord.UserName.startsWith("SISTRO_") && !roles.includes("rekanan")) {
            roles = [...roles, "rekanan"];
          }

          // Return object formatted for NextAuth Session
          return {
            id: userRecord.Id,
            name: userRecord.FullName || userRecord.UserName,
            email: userRecord.Email,
            role: roles[0], // Default to first role, but we include ALL roles below
            roles: roles,   // NEW: Include all roles
            companyCode: userRecord.SapVendorCode || null,
            nik: userRecord.NIK || null,
          };
        } catch (error) {
          console.error("Auth error:", error);
          throw error;
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.roles = (user as any).roles;
        token.id = (user as any).id;
        token.companyCode = (user as any).companyCode;
        token.nik = (user as any).nik;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role;
        (session.user as any).roles = token.roles;
        (session.user as any).id = token.id;
        (session.user as any).companyCode = token.companyCode;
        (session.user as any).nik = token.nik;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login', // Adjust this to match your login route
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || "SUPER_SECRET_CHANGE_ME_LATER"
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
