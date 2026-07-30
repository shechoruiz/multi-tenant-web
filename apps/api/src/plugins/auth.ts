import { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import crypto from "node:crypto";
import { PrismaClient } from "@shelf/db";
import { Role, type LoginRequest, type LoginResponse, type AuthUserDTO } from "@shelf/shared";
import { sign } from "../lib/jwt.js";
import { hash, compare } from "../lib/password.js";

const prisma = new PrismaClient();

const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /auth/login
  app.post("/auth/login", async (request: FastifyRequest, reply: FastifyReply) => {
    const { slug, email, password } = request.body as LoginRequest;

    if (!slug || !email || !password) {
      return reply.status(400).send({ error: "slug, email and password are required" });
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant || !tenant.isActive) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const user = await prisma.user.findFirst({
      where: {
        email,
        OR: [
          { tenantId: tenant.id },
          { tenantId: null, role: Role.super_admin },
        ],
      },
    });

    if (!user || !user.isActive) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const valid = await compare(password, user.password);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const accessToken = sign({
      userId: user.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      role: user.role as Role,
    });

    const refreshToken = generateToken();
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    const authUser: AuthUserDTO = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      isActive: user.isActive,
    };

    const response: LoginResponse = { accessToken, user: authUser };

    reply.setCookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/auth",
      maxAge: REFRESH_TOKEN_EXPIRY_MS / 1000,
    });

    return reply.send(response);
  });

  // POST /auth/refresh
  app.post("/auth/refresh", async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies?.refreshToken;
    if (!token) {
      return reply.status(401).send({ error: "Refresh token missing" });
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored || stored.isRevoked) {
      // Possible replay attack — revoke all tokens for this user
      if (stored) {
        await prisma.refreshToken.updateMany({
          where: { userId: stored.userId, isRevoked: false },
          data: { isRevoked: true },
        });
      }
      return reply.status(401).send({ error: "Invalid refresh token" });
    }

    if (stored.expiresAt < new Date()) {
      return reply.status(401).send({ error: "Refresh token expired" });
    }

    // Revoke old token (rotation)
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    const newRefreshToken = generateToken();
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: stored.userId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    const accessToken = sign({
      userId: stored.user.id,
      tenantId: stored.user.tenantId!,
      tenantSlug: "", // TODO: resolve from tenant
      role: stored.user.role as Role,
    });

    reply.setCookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/auth",
      maxAge: REFRESH_TOKEN_EXPIRY_MS / 1000,
    });

    return reply.send({ accessToken });
  });

  // POST /auth/logout
  app.post("/auth/logout", async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies?.refreshToken;
    if (token) {
      await prisma.refreshToken.updateMany({
        where: { token, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    reply.clearCookie("refreshToken", { path: "/auth" });
    return reply.send({ message: "Logged out" });
  });

  // POST /auth/forgot-password
  app.post("/auth/forgot-password", async (request: FastifyRequest, reply: FastifyReply) => {
    const { slug, email } = request.body as { slug: string; email: string };

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (tenant) {
      const user = await prisma.user.findFirst({
        where: { email, tenantId: tenant.id },
      });

      if (user) {
        const resetToken = crypto.randomBytes(32).toString("hex");
        await prisma.user.update({
          where: { id: user.id },
          data: {
            resetToken,
            resetTokenExpires: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
          },
        });
        // TODO: Send email with reset link
      }
    }

    // Always return 200 to avoid email enumeration
    return reply.send({ message: "If the account exists, a reset link has been sent" });
  });

  // POST /auth/reset-password
  app.post("/auth/reset-password", async (request: FastifyRequest, reply: FastifyReply) => {
    const { token, password } = request.body as { token: string; password: string };

    if (!token || !password) {
      return reply.status(400).send({ error: "token and password are required" });
    }

    if (password.length < 8) {
      return reply.status(400).send({ error: "Password must be at least 8 characters" });
    }

    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpires: { gte: new Date() } },
    });

    if (!user) {
      return reply.status(400).send({ error: "Invalid or expired reset token" });
    }

    const hashedPassword = await hash(password);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });

    return reply.send({ message: "Password has been reset successfully" });
  });
}
