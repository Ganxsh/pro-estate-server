
import { Router } from "express";
import {
  registerUser,
  loginUser,
  refreshTokenUser,
  logoutUser,
  getMe,
  updateMe,
} from "../controllers/authController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication and user profile APIs
 */

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       '201':
 *         description: User registered successfully
 *       '400':
 *         description: Invalid registration data
 *       '409':
 *         description: User already exists
 */
router.post("/register", registerUser);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Credentials'
 *     responses:
 *       '200':
 *         description: Login successful
 *       '400':
 *         description: Invalid request
 *       '401':
 *         description: Invalid credentials
 */
router.post("/login", loginUser);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh the access token
 *     tags: [Auth]
 *     responses:
 *       '200':
 *         description: Access token refreshed successfully
 *       '400':
 *         description: Invalid or missing refresh token
 *       '401':
 *         description: Refresh token is invalid or expired
 */
router.post("/refresh", refreshTokenUser);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Log out the current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: User logged out successfully
 *       '400':
 *         description: Invalid logout request
 *       '401':
 *         description: Unauthorized
 */
router.post("/logout", logoutUser);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get the current user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: User profile retrieved successfully
 *       '401':
 *         description: Unauthorized
 */
router.get("/me", authenticateToken, getMe);

/**
 * @openapi
 * /api/auth/me:
 *   patch:
 *     summary: Update the current user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUser'
 *     responses:
 *       '200':
 *         description: User profile updated successfully
 *       '400':
 *         description: Invalid profile data
 *       '401':
 *         description: Unauthorized
 */
router.patch("/me", authenticateToken, updateMe);

export default router;
