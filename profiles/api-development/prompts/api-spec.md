# API Specification Generation Prompt

You are tasked with generating a comprehensive REST API specification document.

## Requirements

The specification should include:

1. **Overview**
   - Purpose of the API
   - Target audience
   - Key features

2. **Authentication**
   - Authentication method (Bearer token, API key, OAuth, etc.)
   - How to obtain credentials
   - Authentication headers required

3. **Base URL**
   - Production URL
   - Staging URL (if applicable)

4. **Endpoints**
   For each endpoint:
   - HTTP method (GET, POST, PUT, DELETE, PATCH)
   - Path with parameters
   - Description
   - Request headers
   - Request body schema (if applicable)
   - Response codes (200, 400, 401, 404, 500, etc.)
   - Response body schema
   - Example requests and responses

5. **Data Models**
   - Schema definitions for resources
   - Field types and descriptions
   - Required vs optional fields
   - Validation rules

6. **Error Handling**
   - Error response format
   - Common error codes
   - Error messages

7. **Rate Limiting**
   - Rate limit policies
   - Headers returned

8. **Versioning**
   - API version strategy
   - How to specify version in requests

## Format

Use Markdown with clear sections and code blocks for examples.

## Example Structure

```markdown
# API Specification

## Overview
[Description of API purpose and capabilities]

## Authentication
[Authentication details]

## Base URL
`https://api.example.com/v1`

## Endpoints

### GET /resources
Returns a list of resources.

**Request Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "123",
      "name": "Resource 1"
    }
  ],
  "total": 100
}
```
```

Generate a complete, professional API specification based on these guidelines.
