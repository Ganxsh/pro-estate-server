import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  createInquiry,
  getPropertyInquiries,
  getMyInquiries,
} from "../controllers/inquiryController.js";

const router = Router();

// 1. POST /api/inquiries - Send an inquiry about a property (Authenticated)
router.post("/", authenticateToken, createInquiry);

// 2. GET /api/inquiries/me - View all inquiries sent by the logged-in user (Authenticated)
// Note: Place this before dynamic parameters like "/property/:propertyId" if needed, though they don't clash here.
router.get("/me", authenticateToken, getMyInquiries);

// 3. GET /api/inquiries/property/:propertyId - View inquiries for a specific property (Authenticated - Owner only)
router.get("/property/:propertyId", authenticateToken, getPropertyInquiries);

export default router;