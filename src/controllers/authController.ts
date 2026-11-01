import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/database_pg.js";
import { z } from "zod";

// Zod validation schemas
export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character (e.g., !@#$%^&*)"),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

const generateTokenSchema = (userId: number, email: string) => {
  const accessToken = jwt.sign({ userId, email }, process.env.JWT_ACCESS_SECRET as string, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET as string, { expiresIn: "7d" });
  return { accessToken, refreshToken };
};

// 1. Register User
export const registerUser = async (req: Request, res: Response) => {
  try {
    const Validation = RegisterSchema.safeParse(req.body);
    if (!Validation.success) {
      return res.status(400).json({ error: Validation.error.format() });
    }

    const { name, email, password } = Validation.data;

    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, hashedPassword]
    );

    return res.status(201).json({
      message: "User registered successfully",
      user: newUser.rows[0],
    });
  } catch (error) {
    console.error("Error during user registration:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// 2. Login User
export const loginUser = async (req: Request, res: Response) => {
  try {
    const Validation = LoginSchema.safeParse(req.body);
    if (!Validation.success) {
      return res.status(400).json({ error: Validation.error.format() });
    }

    const { email, password } = Validation.data;

    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const { accessToken, refreshToken } = generateTokenSchema(user.id, user.email);

    const salt = await bcrypt.genSalt(10);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);
    await pool.query("UPDATE users SET refresh_token_hash = $1 WHERE id = $2", [hashedRefreshToken, user.id]);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Error during user login:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// 3. Refresh Token
export const refreshTokenUser = async (req: Request, res: Response) => {
  try {
    const cookies = req.cookies;
    if (!cookies?.refreshToken) {
      return res.status(401).json({ error: "Refresh token missing" });
    }

    const refreshToken = cookies.refreshToken;

    let decoded: { userId: number; iat?: number };
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || "refresh_secret") as { userId: number; iat?: number };
    } catch {
      return res.status(403).json({ error: "Invalid or expired refresh token" });
    }

    const result = await pool.query("SELECT * FROM users WHERE id = $1", [decoded.userId]);
    if (result.rows.length === 0 || !result.rows[0].refresh_token_hash) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(refreshToken, user.refresh_token_hash);
    if (!isMatch) {
      return res.status(403).json({ error: "Token mismatch / potential reuse detected" });
    }

    // Always issue a new access token
    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_ACCESS_SECRET as string,
      { expiresIn: "15m" }
    );

    // Only rotate the refresh token when it is older than 3.5 days
    // This prevents a race condition (e.g. React Strict Mode double-mount)
    // from invalidating a perfectly valid session.
    const tokenAgeSeconds = decoded.iat ? Math.floor(Date.now() / 1000) - decoded.iat : Infinity;
    const ROTATE_AFTER_SECONDS = 3.5 * 24 * 60 * 60; // 3.5 days

    if (tokenAgeSeconds > ROTATE_AFTER_SECONDS) {
      const newRefreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET as string,
        { expiresIn: "7d" }
      );
      const salt = await bcrypt.genSalt(10);
      const newRefreshHash = await bcrypt.hash(newRefreshToken, salt);
      await pool.query("UPDATE users SET refresh_token_hash = $1 WHERE id = $2", [newRefreshHash, user.id]);

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired refresh token" });
  }
};

// 5. Get current user profile
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId?.userId;
    const result = await pool.query(
      "SELECT id, name, email, phone, posted_by, builder_name, created_at FROM users WHERE id = $1",
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
    return res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

// 6. Update current user profile
export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId?.userId;

    const schema = z.object({
      phone: z.string().regex(/^\+?[0-9]{7,15}$/, "Invalid phone number").optional().nullable(),
      posted_by: z.enum(["Owner", "Dealer", "Builder"]).optional().nullable(),
      builder_name: z.string().max(150).optional().nullable(),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ error: validation.error.format() });

    const { phone, posted_by, builder_name } = validation.data;

    const result = await pool.query(
      `UPDATE users
       SET phone = COALESCE($1, phone),
           posted_by = COALESCE($2, posted_by),
           builder_name = COALESCE($3, builder_name)
       WHERE id = $4
       RETURNING id, name, email, phone, posted_by, builder_name, created_at`,
      [phone ?? null, posted_by ?? null, builder_name ?? null, userId]
    );

    return res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

// 4. Logout User
export const logoutUser = async (req: Request, res: Response) => {
  try {
    const cookies = req.cookies;
    if (cookies?.refreshToken) {
      try {
        const decoded = jwt.verify(cookies.refreshToken, process.env.JWT_REFRESH_SECRET || "refresh_secret") as { userId: number };
        await pool.query("UPDATE users SET refresh_token_hash = NULL WHERE id = $1", [decoded.userId]);
      } catch (e) {
        // Token might be expired, safely ignore and clear cookie anyway
      }
    }
    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    });
    return res.json({ message: "Logged out successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
};