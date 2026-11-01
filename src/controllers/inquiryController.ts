import type { Request, Response } from "express";
import { z } from "zod";
import pool from "../config/database_pg.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import { sendInquiryEmail } from "../services/mailer.js";

// Zod schema for inquiry validation
export const InquirySchema = z.object({
  property_id: z.number().int().positive("Property ID must be valid"),
  message: z.string().min(5, "Inquiry message must be at least 5 characters long"),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number").optional(),
});

// 1. Send an inquiry about a property
export const createInquiry = async (req: AuthRequest, res: Response) => {
  try {
    const validation = InquirySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.format() });
    }

    const { property_id, message, phone } = validation.data;
    const sender_id = req.userId?.userId;

    // Check if the property exists and fetch owner details in one query
    const propertyCheck = await pool.query(
      `SELECT p.owner_id, p.title, u.name AS owner_name, u.email AS owner_email
       FROM properties p
       JOIN users u ON u.id = p.owner_id
       WHERE p.id = $1`,
      [property_id]
    );
    if (propertyCheck.rows.length === 0) {
      return res.status(404).json({ error: "Property not found" });
    }

    const { owner_id: propertyOwnerId, title: propertyTitle, owner_name, owner_email } = propertyCheck.rows[0];

    // Prevent users from inquiring about their own property
    if (propertyOwnerId === sender_id) {
      return res.status(400).json({ error: "You cannot send an inquiry on your own property" });
    }

    // Fetch sender details for the email
    const senderResult = await pool.query("SELECT name, email FROM users WHERE id = $1", [sender_id]);
    const sender = senderResult.rows[0];

    // Insert inquiry into the database
    const newInquiry = await pool.query(
      `INSERT INTO inquiries (property_id, sender_id, message, phone) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [property_id, sender_id, message, phone ?? null]
    );

    // Send email notification to property owner (non-blocking)
    sendInquiryEmail({
      ownerEmail: owner_email,
      ownerName: owner_name,
      propertyTitle,
      senderName: sender.name,
      senderEmail: sender.email,
      senderPhone: phone ?? null,
      message,
    }).catch((err) => console.error("Failed to send inquiry email:", err));

    return res.status(201).json({
      message: "Inquiry sent successfully",
      inquiry: newInquiry.rows[0],
    });
  } catch (error: any) {
    // Handle unique constraint violation (duplicate inquiry for the same property by the same user)
    if (error.code === "23505") {
      return res.status(400).json({ error: "You have already sent an inquiry for this property" });
    }
    console.error("Error sending inquiry:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// 2. View inquiries for a specific property (Owner only)
export const getPropertyInquiries = async (req: AuthRequest, res: Response) => {
  try {
    const { propertyId } = req.params;
    const userId = req.userId?.userId;

    // Verify property ownership
    const propertyCheck = await pool.query("SELECT owner_id FROM properties WHERE id = $1", [propertyId]);
    if (propertyCheck.rows.length === 0) {
      return res.status(404).json({ error: "Property not found" });
    }

    if (propertyCheck.rows[0].owner_id !== userId) {
      return res.status(403).json({ error: "Unauthorized: You do not own this property" });
    }

    // Fetch inquiries along with sender details
    const inquiries = await pool.query(
      `SELECT i.id, i.message, i.phone, i.created_at, u.id AS sender_id, u.name AS sender_name, u.email AS sender_email 
       FROM inquiries i
       JOIN users u ON i.sender_id = u.id
       WHERE i.property_id = $1
       ORDER BY i.created_at DESC`,
      [propertyId]
    );

    return res.status(200).json({
      count: inquiries.rows.length,
      inquiries: inquiries.rows,
    });
  } catch (error) {
    console.error("Error fetching property inquiries:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// 3. View all inquiries sent by the logged-in user
export const getMyInquiries = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId?.userId;

    const inquiries = await pool.query(
      `SELECT i.id, i.message, i.phone, i.created_at, p.id AS property_id, p.title AS property_title, p.city AS property_city 
       FROM inquiries i
       JOIN properties p ON i.property_id = p.id
       WHERE i.sender_id = $1
       ORDER BY i.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      count: inquiries.rows.length,
      inquiries: inquiries.rows,
    });
  } catch (error) {
    console.error("Error fetching user inquiries:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};