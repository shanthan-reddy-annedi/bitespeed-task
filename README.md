# Bitespeed Contact Identification API

[![NestJS](https://img.shields.io/badge/NestJS-11.0.1-E0234E.svg)](https://nestjs.com/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3.25-orange.svg)](https://typeorm.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791.svg)](https://www.postgresql.org/)
[![Swagger](https://img.shields.io/badge/Swagger-Latest-85EA2D.svg)](https://swagger.io/)

## Live Demo

- **API Endpoint**: [https://bitespeed-task-rh51.onrender.com/identify](https://bitespeed-task-rh51.onrender.com/identify)
- **Swagger Documentation**: [https://bitespeed-task-rh51.onrender.com/docs](https://bitespeed-task-rh51.onrender.com/docs)

## Overview

The Bitespeed Contact Identification API is a service that identifies and consolidates customer contact information across multiple touchpoints. It helps businesses maintain a unified view of customer data by linking related contact information (email addresses and phone numbers) and establishing primary/secondary relationships between them.

### Key Features

- **Contact Identification**: Identify contacts based on email or phone number
- **Contact Consolidation**: Automatically link and consolidate related contacts
- **Primary/Secondary Relationship**: Maintain hierarchical relationships between contacts
- **RESTful API**: Simple and intuitive API design
- **Swagger Documentation**: Interactive API documentation
- **Validation**: Input validation with meaningful error messages

## API Documentation

### POST /identify

Identifies a contact based on email and/or phone number and returns consolidated contact information.

#### Request Format

```json
{
  "email": "example@example.com",
  "phoneNumber": "1234567890"
}
```

**Note**: At least one of `email` or `phoneNumber` must be provided.

#### Response Format

```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["example@example.com", "another@example.com"],
    "phoneNumbers": ["1234567890", "0987654321"],
    "secondaryContactIds": [2, 3]
  }
}
```

### Business Logic

1. When a request is received with an email/phone that doesn't exist in the database:
   - A new contact is created with `linkPrecedence = PRIMARY`

2. When a request contains information that matches existing contacts:
   - The system finds all related contacts (primary and secondary)
   - The oldest primary contact becomes the definitive primary contact
   - If the request contains new information (email or phone not in the system), a new secondary contact is created
   - The response includes all consolidated information with the primary contact ID

## Technical Architecture

### Technology Stack

- **Framework**: NestJS 11.0.1
- **Database**: PostgreSQL
- **ORM**: TypeORM 0.3.25
- **Documentation**: Swagger/OpenAPI
- **Validation**: class-validator
- **Environment**: dotenv

### Database Schema

```sql
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(255),
  email VARCHAR(255),
  linked_id INTEGER,
  link_precedence ENUM('primary', 'secondary') DEFAULT 'primary',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### Project Structure

```text
/
├── src/
│   ├── config/
│   │   └── database.config.ts    # Database configuration
│   ├── contact/
│   │   ├── dto/
│   │   │   ├── identify-request.dto.ts   # Request DTO with validation
│   │   │   └── identify-response.dto.ts  # Response DTO
│   │   ├── entities/
│   │   │   └── contact.entity.ts         # Contact entity
│   │   ├── contact.controller.ts         # API endpoints
│   │   ├── contact.service.ts           # Business logic
│   │   └── contact.module.ts            # Module definition
│   ├── app.module.ts                    # Main application module
│   └── main.ts                          # Application entry point
├── .env                                # Environment variables
└── .env.example                        # Environment template
```

## Local Development

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- PostgreSQL

### Installation

1. Clone the repository

   ```bash
   git clone <repository-url>
   cd bitespeed-task
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Set up environment variables

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. Start the application

   ```bash
   npm run start:dev
   ```

5. Access the API at [http://localhost:3000/identify](http://localhost:3000/identify)
6. Access Swagger documentation at [http://localhost:3000/docs](http://localhost:3000/docs)

## Deployment

The application is deployed on [Render](https://render.com), a cloud platform for hosting web services.

### Deployment Configuration

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:prod`
- **Environment Variables**:
  - `DATABASE_URL`: PostgreSQL connection string
  - `PORT`: Application port (default: 3000)
  - `DB_SYNC`: Whether to sync database schema (true/false)
  - `DB_SSL`: Whether to use SSL for database connection (true/false)

### Deployment Steps

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the build and start commands
4. Set up environment variables
5. Deploy the application

## Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run test coverage
npm run test:cov
```

## Example API Usage

### cURL

```bash
curl -X POST https://bitespeed-task-rh51.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"george@hillvalley.edu","phoneNumber":"717171"}'
```

### JavaScript (Fetch)

```javascript
fetch('https://bitespeed-task-rh51.onrender.com/identify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'george@hillvalley.edu',
    phoneNumber: '717171'
  }),
})
.then(response => response.json())
.then(data => console.log(data));
```

## License

This project is licensed under the [MIT License](LICENSE).
