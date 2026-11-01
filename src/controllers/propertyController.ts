
import type { Request, Response } from "express";
import pool from "../config/database_pg.js";
import { unknown, z } from "zod";
import type { AuthRequest } from "../middleware/authMiddleware.js";

// Allowed property types must match the PostgreSQL CHECK constraint.
const propertyTypes = [
  "Residential Apartment",
  "Residential Plot",
  "Independent House / Villa",
  "Farm House",
] as const;

// Allowed listing publishers must match properties_posted_by_check.
const postedByTypes = ["Owner", "Dealer", "Builder"] as const;

// Optional numeric fields may be omitted, null, or an empty string
// when submitted by a frontend form.
const optionalPositiveNumber = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined
      ? undefined
      : value,
  z.coerce.number().positive("Value must be greater than zero").optional()
);

// Reusable property validation schema.
export const PropertySchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(255),

  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters long"),

  city: z.string().trim().min(2, "City is required").max(100),

  address: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters long"),

  price: z.coerce
    .number()
    .positive("Price must be a positive number"),

  property_type: z.enum(propertyTypes, {
    error: "Please select a valid property type",
  }),

  posted_by: z.enum(postedByTypes).default("Owner"),

  bedrooms: z.coerce
    .number()
    .int("Bedrooms must be an integer")
    .min(0, "Bedrooms must be zero or more"),

  total_square_feet: optionalPositiveNumber,

  length_feet: optionalPositiveNumber,

  breadth_feet: optionalPositiveNumber,

  images: z
    .array(
      z.string().refine(
        (val) => val.startsWith("data:image/") || z.string().url().safeParse(val).success,
        { message: "Each image must be a valid URL or base64 data URL" }
      )
    )
    .optional()
    .default([]),
});

// Validates route IDs.
const propertyIdSchema = z.coerce
  .number()
  .int()
  .positive();

// Safely validates pagination query parameters.
const paginationSchema = z.object({
  limits: z.coerce.number().int().min(1).max(100).default(10),
  page: z.coerce.number().int().min(1).default(1),
});

// Helper for extracting and validating a property ID.
const parsePropertyId = (id: string | unknown) => propertyIdSchema.safeParse(id);

// 1. Create Property
export const createProperty = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const ownerId = req.userId?.userId;

    if (ownerId == null) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const validation = PropertySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid property data",
        details: validation.error.flatten(),
      });
    }

    const {
      title,
      description,
      city,
      address,
      price,
      property_type,
      posted_by,
      bedrooms,
      total_square_feet,
      length_feet,
      breadth_feet,
      images,
    } = validation.data;

    const result = await pool.query(
      `INSERT INTO properties (
        owner_id,
        title,
        description,
        city,
        address,
        price,
        property_type,
        posted_by,
        bedrooms,
        total_square_feet,
        length_feet,
        breadth_feet,
        images
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
      RETURNING *`,
      [
        ownerId,
        title,
        description,
        city,
        address,
        price,
        property_type,
        posted_by,
        bedrooms,
        total_square_feet ?? null,
        length_feet ?? null,
        breadth_feet ?? null,
        images,
      ]
    );

    return res.status(201).json({
      message: "Property created successfully",
      property: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating property:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

// 2. Get / Search Properties
export const getProperties = async (
  req: Request,
  res: Response
) => {
  try {
    const { city, property_type, min_price, max_price, bedrooms, posted_by, search } =
      req.query;

    const pagination = paginationSchema.safeParse({
      limits: req.query.limits ?? 10,
      page: req.query.page ?? 1,
    });

    if (!pagination.success) {
      return res.status(400).json({
        error: "Invalid pagination parameters",
        details: pagination.error.flatten(),
      });
    }

    const { limits, page } = pagination.data;

    const filtersSchema = z.object({
      city: z.string().trim().min(1).optional(),
      property_type: z.enum(propertyTypes).optional(),
      min_price: z.coerce.number().min(0).optional(),
      max_price: z.coerce.number().min(0).optional(),
      bedrooms: z.coerce.number().int().positive().optional(),
      posted_by: z.enum(postedByTypes).optional(),
      search: z.string().trim().min(1).optional(),
    });

    const filters = filtersSchema.safeParse({
      ...(city !== undefined ? { city } : {}),
      ...(property_type !== undefined ? { property_type } : {}),
      ...(min_price !== undefined ? { min_price } : {}),
      ...(max_price !== undefined ? { max_price } : {}),
      ...(bedrooms !== undefined ? { bedrooms } : {}),
      ...(posted_by !== undefined ? { posted_by } : {}),
      ...(search !== undefined ? { search } : {}),
    });

    if (!filters.success) {
      return res.status(400).json({
        error: "Invalid search filters",
        details: filters.error.flatten(),
      });
    }

    const {
      city: searchCity,
      property_type: searchType,
      min_price: minPrice,
      max_price: maxPrice,
      bedrooms: bedroomCount,
      posted_by: postedBy,
      search: searchTerm,
    } = filters.data;

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return res.status(400).json({
        error: "Minimum price cannot exceed maximum price",
      });
    }

    let query = "SELECT * FROM properties WHERE 1=1";
    const queryParams: (string | number)[] = [];
    let paramIndex = 1;

    if (searchTerm) {
      query += ` AND (title ILIKE $${paramIndex} OR city ILIKE $${paramIndex} OR address ILIKE $${paramIndex} OR property_type ILIKE $${paramIndex})`;
      queryParams.push(`%${searchTerm}%`);
      paramIndex++;
    }

    if (searchCity) {
      query += ` AND city ILIKE $${paramIndex++}`;
      queryParams.push(`%${searchCity}%`);
    }

    if (searchType) {
      query += ` AND property_type = $${paramIndex++}`;
      queryParams.push(searchType);
    }

    if (minPrice !== undefined) {
      query += ` AND price >= $${paramIndex++}`;
      queryParams.push(minPrice);
    }

    if (maxPrice !== undefined) {
      query += ` AND price <= $${paramIndex++}`;
      queryParams.push(maxPrice);
    }

    if (bedroomCount !== undefined) {
      query += ` AND bedrooms = $${paramIndex++}`;
      queryParams.push(bedroomCount);
    }

    if (postedBy) {
      query += ` AND posted_by = $${paramIndex++}`;
      queryParams.push(postedBy);
    }

    const offset = (page - 1) * limits;

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limits, offset);

    const result = await pool.query(query, queryParams);

    return res.status(200).json({
      properties: result.rows,
      page,
      limit: limits,
    });
  } catch (error) {
    console.error("Error fetching properties:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

// 3. Get the authenticated user's properties
export const getMyProperties = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const ownerId = req.userId?.userId;

    if (ownerId == null) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await pool.query(
      `SELECT *
       FROM properties
       WHERE owner_id = $1
       ORDER BY created_at DESC`,
      [ownerId]
    );

    return res.status(200).json({
      properties: result.rows,
    });
  } catch (error) {
    console.error("Error fetching user's properties:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

// 4. Update Property
export const updateProperty = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const ownerId = req.userId?.userId;

    if (ownerId == null) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const parsedId = parsePropertyId(req.params.id);

    if (!parsedId.success) {
      return res.status(400).json({ error: "Invalid property ID" });
    }

    const id = parsedId.data;

    const existing = await pool.query(
      "SELECT * FROM properties WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Property not found" });
    }

    if (String(existing.rows[0].owner_id) !== String(ownerId)) {
      return res.status(403).json({
        error: "Unauthorized: You do not own this listing",
      });
    }

    // Require the same validation rules as property creation.
    const validation = PropertySchema.partial().safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid property data",
        details: validation.error.flatten(),
      });
    }

    const updates = validation.data;
    const updateEntries = Object.entries(updates);

    if (updateEntries.length === 0) {
      return res.status(400).json({
        error: "No update fields provided",
      });
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of updateEntries) {
      // Only use keys defined in PropertySchema.
      fields.push(`${key} = $${values.length + 1}`);

      if (
        key === "total_square_feet" ||
        key === "length_feet" ||
        key === "breadth_feet"
      ) {
        values.push(value ?? null);
      } else {
        values.push(value);
      }
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const query = `
      UPDATE properties
      SET ${fields.join(", ")}
      WHERE id = $${values.length}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    return res.status(200).json({
      message: "Property updated successfully",
      property: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating property:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

// 5. Get a Single Property by ID
export const getPropertyById = async (
  req: Request,
  res: Response
) => {
  try {
    const parsedId = parsePropertyId(req.params.id);

    if (!parsedId.success) {
      return res.status(400).json({ error: "Invalid property ID" });
    }

    const result = await pool.query(
      "SELECT * FROM properties WHERE id = $1",
      [parsedId.data]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Property not found" });
    }

    return res.status(200).json({
      property: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching property:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

// 7. Platform Stats (public)
export const getPlatformStats = async (
  _req: Request,
  res: Response
) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM properties)::int                                          AS total_properties,
        (SELECT COUNT(*) FROM users)::int                                               AS total_users,
        (SELECT COUNT(DISTINCT owner_id) FROM properties
          WHERE posted_by IN ('Builder', 'Dealer'))::int                                AS total_builders_dealers
    `);
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching platform stats:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// 6. Delete Property
export const deleteProperty = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const ownerId = req.userId?.userId;

    if (ownerId == null) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const parsedId = parsePropertyId(req.params.id);

    if (!parsedId.success) {
      return res.status(400).json({ error: "Invalid property ID" });
    }

    const id = parsedId.data;

    const existing = await pool.query(
      "SELECT owner_id FROM properties WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Property not found" });
    }

    if (String(existing.rows[0].owner_id) !== String(ownerId)) {
      return res.status(403).json({
        error: "Unauthorized: You do not own this listing",
      });
    }

    await pool.query(
      "DELETE FROM properties WHERE id = $1",
      [id]
    );

    return res.status(200).json({
      message: "Property deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting property:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
