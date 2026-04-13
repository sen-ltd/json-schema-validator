/**
 * Example schemas and data for the JSON Schema validator demo.
 */

export const examples = [
  {
    id: 'user',
    label: { ja: 'ユーザー', en: 'User' },
    schema: {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "User",
      "type": "object",
      "required": ["id", "email", "name"],
      "properties": {
        "id": {
          "type": "integer",
          "minimum": 1
        },
        "email": {
          "type": "string",
          "format": "email"
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "age": {
          "type": "integer",
          "minimum": 0,
          "maximum": 150
        },
        "role": {
          "type": "string",
          "enum": ["admin", "editor", "viewer"]
        }
      },
      "additionalProperties": false
    },
    data: {
      "id": 1,
      "email": "alice@example.com",
      "name": "Alice",
      "age": 30,
      "role": "admin"
    }
  },
  {
    id: 'product',
    label: { ja: '商品', en: 'Product' },
    schema: {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "Product",
      "type": "object",
      "required": ["id", "name", "price"],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[A-Z]{2}\\d{4}$"
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "price": {
          "type": "number",
          "exclusiveMinimum": 0
        },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "uniqueItems": true,
          "maxItems": 10
        },
        "dimensions": {
          "type": "object",
          "properties": {
            "width": { "type": "number", "minimum": 0 },
            "height": { "type": "number", "minimum": 0 },
            "depth": { "type": "number", "minimum": 0 }
          },
          "required": ["width", "height"]
        }
      }
    },
    data: {
      "id": "AB1234",
      "name": "Widget Pro",
      "price": 29.99,
      "tags": ["electronics", "gadget"],
      "dimensions": {
        "width": 10,
        "height": 5,
        "depth": 2
      }
    }
  },
  {
    id: 'config',
    label: { ja: 'コンフィグ', en: 'Config' },
    schema: {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "AppConfig",
      "type": "object",
      "required": ["version", "server"],
      "properties": {
        "version": {
          "type": "string",
          "pattern": "^\\d+\\.\\d+\\.\\d+$"
        },
        "debug": {
          "type": "boolean"
        },
        "server": {
          "type": "object",
          "required": ["host", "port"],
          "properties": {
            "host": { "type": "string", "minLength": 1 },
            "port": {
              "type": "integer",
              "minimum": 1,
              "maximum": 65535
            },
            "tls": { "type": "boolean" }
          }
        },
        "allowedOrigins": {
          "type": "array",
          "items": { "type": "string", "format": "uri" },
          "minItems": 1
        },
        "maxConnections": {
          "type": "integer",
          "minimum": 1,
          "maximum": 10000,
          "multipleOf": 10
        }
      }
    },
    data: {
      "version": "1.0.0",
      "debug": false,
      "server": {
        "host": "localhost",
        "port": 8080,
        "tls": false
      },
      "allowedOrigins": ["https://example.com"],
      "maxConnections": 100
    }
  }
];
