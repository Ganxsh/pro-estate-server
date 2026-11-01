
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Pro Estate API",
      version: "1.0.0",
      description:
        "API documentation for the Pro Estate real estate platform.",
    },

    servers: [
      {
        url: "https://pro-estate-server.onrender.com",
        description: "Production server",
      },
      {
        url: "http://localhost:5000",
        description: "Local development server",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },

      schemas: {
        User: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: {
              type: "string",
              example: "Ganesh Kumar",
            },
            email: {
              type: "string",
              format: "email",
              example: "ganesh@example.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "ExamplePassword123!",
            },
          },
        },

        Credentials: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "ganesh@example.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "ExamplePassword123!",
            },
          },
        },

        UpdateUser: {
          type: "object",
          properties: {
            name: {
              type: "string",
              example: "Ganesh Kumar",
            },
            email: {
              type: "string",
              format: "email",
              example: "ganesh@example.com",
            },
          },
        },

        Property: {
          type: "object",
          required: [
            "title",
            "description",
            "city",
            "address",
            "price",
            "property_type",
          ],
          properties: {
            title: {
              type: "string",
              example: "Modern 2 BHK Apartment",
            },
            description: {
              type: "string",
              example: "Spacious apartment in Chennai.",
            },
            city: {
              type: "string",
              example: "Chennai",
            },
            address: {
              type: "string",
              example: "OMR, Chennai",
            },
            price: {
              type: "number",
              example: 6500000,
            },
            property_type: {
              type: "string",
              enum: [
                "Residential Apartment",
                "Residential Plot",
                "Independent House / Villa",
                "Farm House",
              ],
            },
            posted_by: {
              type: "string",
              enum: ["Owner", "Dealer", "Builder"],
            },
            bedrooms: {
              type: "integer",
              example: 2,
            },
            total_square_feet: {
              type: "number",
              example: 1200,
            },
            length_feet: {
              type: "number",
              example: 40,
            },
            breadth_feet: {
              type: "number",
              example: 30,
            },
            images: {
              type: "array",
              items: {
                type: "string",
              },
              example: ["https://example.com/property.jpg"],
            },
          },
        },

        PropertyUpdate: {
          type: "object",
          description: "Only include fields being updated.",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            city: { type: "string" },
            address: { type: "string" },
            price: { type: "number" },
            property_type: {
              type: "string",
              enum: [
                "Residential Apartment",
                "Residential Plot",
                "Independent House / Villa",
                "Farm House",
              ],
            },
            posted_by: {
              type: "string",
              enum: ["Owner", "Dealer", "Builder"],
            },
            bedrooms: { type: "integer" },
            total_square_feet: { type: "number" },
            length_feet: { type: "number" },
            breadth_feet: { type: "number" },
            images: {
              type: "array",
              items: { type: "string" },
            },
          },
        },

        Inquiry: {
          type: "object",
          required: ["property_id"],
          properties: {
            property_id: {
              type: "integer",
              example: 12,
            },
            message: {
              type: "string",
              example:
                "I am interested in this property. Is it available?",
            },
          },
        },
      },
    },
  },

  apis: ["./src/routes/**/*.ts", "./src/routes/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
