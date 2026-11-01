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

// 1; /api/properties - Create a list
router.post("/", authenticateToken, createProperty);

// 2; /api/properties - Browse/search listings (Public)
router.get("/", getProperties);

// 3; /api/properties/me/properties - View your listings (Authenticated)
// Note: Place this BEFORE "/:id" so Express doesn't mistake "me" for an ID parameter!
router.get("/me/properties", authenticateToken, getMyProperties);

// 7; /api/properties/stats - Platform-wide counts (Public)
router.get("/stats", getPlatformStats);

// 4; /api/properties/:id - View single property (Public)
router.get("/:id", getPropertyById);

// 5; /api/properties/:id - Update your own listing
router.patch("/:id", authenticateToken, updateProperty);

// 6; /api/properties/:id - Delete your own list
router.delete("/:id", authenticateToken, deleteProperty);

export default router;