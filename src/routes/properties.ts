
import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  createProperty,
  getProperties,
  getMyProperties,
  updateProperty,
  getPropertyById,
  deleteProperty,
  getPlatformStats,
} from "../controllers/propertyController.js";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Properties
 *     description: Property listing and platform statistics APIs
 */

/**
 * @openapi
 * /api/properties:
 *   post:
 *     summary: Create a new property listing
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Property'
 *     responses:
 *       '201':
 *         description: Property created successfully
 *       '400':
 *         description: Invalid property data
 *       '401':
 *         description: Unauthorized
 */
router.post("/", authenticateToken, createProperty);

/**
 * @openapi
 * /api/properties:
 *   get:
 *     summary: Browse and search property listings
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter properties by city
 *       - in: query
 *         name: property_type
 *         schema:
 *           type: string
 *         description: Filter by property type
 *       - in: query
 *         name: min_price
 *         schema:
 *           type: number
 *         description: Minimum property price
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *         description: Maximum property price
 *     responses:
 *       '200':
 *         description: Properties retrieved successfully
 *       '400':
 *         description: Invalid query parameters
 */
router.get("/", getProperties);

/**
 * @openapi
 * /api/properties/me/properties:
 *   get:
 *     summary: Get properties belonging to the logged-in user
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: User properties retrieved successfully
 *       '401':
 *         description: Unauthorized
 */
router.get("/me/properties", authenticateToken, getMyProperties);

/**
 * @openapi
 * /api/properties/stats:
 *   get:
 *     summary: Get platform-wide property statistics
 *     tags: [Properties]
 *     responses:
 *       '200':
 *         description: Platform statistics retrieved successfully
 *       '500':
 *         description: Failed to retrieve statistics
 */
router.get("/stats", getPlatformStats);

/**
 * @openapi
 * /api/properties/{id}:
 *   get:
 *     summary: Get a property by ID
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The property ID
 *     responses:
 *       '200':
 *         description: Property retrieved successfully
 *       '404':
 *         description: Property not found
 */
router.get("/:id", getPropertyById);

/**
 * @openapi
 * /api/properties/{id}:
 *   patch:
 *     summary: Update your own property listing
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PropertyUpdate'
 *     responses:
 *       '200':
 *         description: Property updated successfully
 *       '400':
 *         description: Invalid property data
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Property not found
 */
router.patch("/:id", authenticateToken, updateProperty);

/**
 * @openapi
 * /api/properties/{id}:
 *   delete:
 *     summary: Delete your own property listing
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *     responses:
 *       '200':
 *         description: Property deleted successfully
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Property not found
 */
router.delete("/:id", authenticateToken, deleteProperty);

export default router;
