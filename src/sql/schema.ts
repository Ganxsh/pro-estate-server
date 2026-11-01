import pool from "../config/database_pg.js";


const createTables = async () =>{

    const queryText = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(100) NOT NULL,
      refresh_token_hash VARCHAR(255),
      phone VARCHAR(20),
      posted_by VARCHAR(20) CHECK (posted_by IN ('Owner', 'Dealer', 'Builder')),
      builder_name VARCHAR(150),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        address TEXT NOT NULL,
        price NUMERIC(12, 2) NOT NULL,
        property_type VARCHAR(50) NOT NULL,
        bedrooms INT NOT NULL,
        images TEXT[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inquiries (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        phone VARCHAR(15) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_property_inquiry UNIQUE (property_id, sender_id)
    );

    -- Indexes for 50,000+ records performance
    CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
    CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type);
    CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
    CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON properties(bedrooms);`

try {
    await pool.query(queryText);

    // Migrate existing users table — add new columns if they don't exist
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
        ADD COLUMN IF NOT EXISTS posted_by VARCHAR(20) CHECK (posted_by IN ('Owner','Dealer','Builder')),
        ADD COLUMN IF NOT EXISTS builder_name VARCHAR(150);
    `);

    console.log("Database tables and indexes created successfully!");
  } catch (err) {
    console.error("Error creating tables:", err);
  }
};

export default createTables;