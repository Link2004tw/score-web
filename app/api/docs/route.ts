import { NextResponse } from "next/server";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Scoreboard API",
    version: "0.1.0",
    description:
      "API for managing student scores. All endpoints require authentication via Firebase ID token (Bearer token in Authorization header or fb_token cookie).",
  },
  servers: [{ url: "/", description: "Current origin" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Firebase ID token",
      },
    },
    schemas: {
      Child: {
        type: "object",
        required: ["name", "grade", "gender", "score"],
        properties: {
          name: { type: "string", example: "Alice Smith" },
          grade: {
            type: "string",
            enum: ["kg1", "kg2", "1 primary", "2 primary", "3 primary", "4 primary", "5 primary", "6 primary"],
          },
          gender: { type: "string", enum: ["male", "female"] },
          score: { type: "number", minimum: 0, example: 95 },
        },
      },
      StoredChild: {
        allOf: [
          { $ref: "#/components/schemas/Child" },
          {
            type: "object",
            required: ["id", "createdAt"],
            properties: {
              id: { type: "string", example: "abc123" },
              createdAt: { type: "string", format: "date-time", example: "2025-01-01T00:00:00Z" },
            },
          },
        ],
      },
    },
  },
  paths: {
    "/api/children": {
      get: {
        summary: "List all children",
        description: "Returns all children sorted by score descending.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of children",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/StoredChild" },
                },
              },
            },
          },
          "401": { description: "Unauthorized — missing or invalid auth token" },
          "500": { description: "Server error" },
        },
      },
    },
    "/api/children/{id}": {
      get: {
        summary: "Get a child by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "The child",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StoredChild" },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Child not found" },
          "500": { description: "Server error" },
        },
      },
    },
  },
};

export function GET() {
  return NextResponse.json(spec);
}
