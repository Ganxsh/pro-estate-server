
import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  createInquiry,
  getPropertyInquiries,
  getMyInquiries,
} from "../controllers/inquiryController.js";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Inquiries
 *     description: Property inquiry management APIs
 */

/**
 * @openapi
 * /api/inquiries:
 *   post:
 *     summary: Send an inquiry about a property
 *     tags: [Inquiries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Inquiry'
 *     responses:
 *       '201':
 *         description: Inquiry created successfully
 *       '400':
 *         description: Invalid inquiry data
 *       '401':
 *         description: Unauthorized
 */
router.post("/", authenticateToken, createInquiry);

/**
 * @openapi
 * /api/inquiries/me:
 *   get:
 *     summary: View inquiries sent by the logged-in user
 *     tags: [Inquiries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Inquiries retrieved successfully
 *       '401':
 *         description: Unauthorized
 */
router.get("/me", authenticateToken, getMyInquiries);

/**
 * @openapi
 * /api/inquiries/property/{propertyId}:
 *   get:
 *     summary: View inquiries for a specific property
 *     description: Intended for the property owner. Actual access depends on controller authorization.
 *     tags: [Inquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the property
 *     responses:
 *       '200':
 *         description: Property inquiries retrieved successfully
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden
 *       '404':
 *         description: Property not found
 */
router.get(
  "/property/:propertyId",
  authenticateToken,
  getPropertyInquiries
);

export default router;
