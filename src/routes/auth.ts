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

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshTokenUser);
router.post("/logout", logoutUser);
router.get("/me", authenticateToken, getMe);
router.patch("/me", authenticateToken, updateMe);

export default router;