# Finance Dashboard Backend

A clean, production-like REST API built with **Node.js + Express + MongoDB (Mongoose)**.

---

## Folder Structure

```
finance-backend/
├── src/
│   ├── app.js                    # Express app + global middleware + error handler
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── models/
│   │   ├── User.js               # User schema (roles, status, password hashing)
│   │   └── Transaction.js        # Transaction schema (soft delete, indexes)
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication
│   │   ├── rbac.js               # Role-based access control (authorize factory)
│   │   └── ownership.js          # Per-resource ownership enforcement
│   ├── controllers/
│   │   ├── authController.js     # register, login, getMe
│   │   ├── userController.js     # Admin user management (CRUD)
│   │   ├── transactionController.js  # Transaction CRUD + filtering + pagination
│   │   └── dashboardController.js    # Aggregated analytics endpoints
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── transactions.js
│   │   └── dashboard.js
│   └── utils/
│       ├── apiError.js           # Custom error class (statusCode + message)
│       └── apiResponse.js        # Consistent JSON response envelope
├── .env.example
└── package.json
```

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your .env file
cp .env.example .env
# Fill in MONGO_URI and JWT_SECRET

# 3. Run in development
npm run dev

# 4. Run in production
npm start
```

---

## Environment Variables

| Variable        | Description                        | Example                              |
|-----------------|------------------------------------|--------------------------------------|
| `PORT`          | HTTP server port                   | `3000`                               |
| `MONGO_URI`     | MongoDB connection string          | `mongodb://localhost:27017/finance`  |
| `JWT_SECRET`    | Secret for signing JWT tokens      | `a_long_random_string`               |
| `JWT_EXPIRES_IN`| Token expiry duration              | `7d`                                 |

---

## Role Permissions Matrix

| Action                        | Viewer | Analyst | Admin |
|-------------------------------|:------:|:-------:|:-----:|
| View dashboard summary        | ✅     | ✅      | ✅    |
| View category totals          | ✅     | ✅      | ✅    |
| View monthly trends           | ✅     | ✅      | ✅    |
| View recent transactions      | ✅     | ✅      | ✅    |
| List/view transactions        | ❌     | ✅ (own)| ✅    |
| Create transactions           | ✅     | ✅      | ✅    |
| Update/delete transactions    | ✅ (own)| ✅ (own)| ✅   |
| List all users                | ❌     | ❌      | ✅    |
| Update/delete users           | ❌     | ❌      | ✅    |

---

## API Reference

### Auth

#### POST `/api/auth/register`
```json
// Request
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "role": "analyst"
}

// Response 201
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "664f1a2b3c4d5e6f7a8b9c0d",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "analyst",
      "status": "active"
    }
  }
}
```

#### POST `/api/auth/login`
```json
// Request
{ "email": "jane@example.com", "password": "secret123" }

// Response 200
{
  "success": true,
  "message": "Login successful",
  "data": { "token": "eyJhbGciOiJIUzI1NiIs...", "user": { ... } }
}
```

#### GET `/api/auth/me`
> Requires: `Authorization: Bearer <token>`

```json
// Response 200
{
  "success": true,
  "message": "Current user fetched",
  "data": { "user": { "_id": "...", "name": "Jane Doe", "role": "analyst" } }
}
```

---

### Transactions

#### GET `/api/transactions`
> Requires: `analyst` or `admin`

**Query parameters:**

| Param       | Type   | Description                           |
|-------------|--------|---------------------------------------|
| `type`      | string | `income` or `expense`                 |
| `category`  | string | Partial match (case-insensitive)      |
| `startDate` | date   | ISO 8601 (e.g. `2024-01-01`)         |
| `endDate`   | date   | ISO 8601                              |
| `page`      | number | Default `1`                           |
| `limit`     | number | Default `20`                          |
| `sortBy`    | string | Default `date`                        |
| `sortOrder` | string | `asc` or `desc` (default `desc`)     |
| `userId`    | string | Admin only — filter by user           |

```json
// Response 200
{
  "success": true,
  "message": "Transactions fetched",
  "data": {
    "transactions": [
      {
        "_id": "664f...",
        "userId": { "_id": "...", "name": "Jane Doe", "email": "jane@example.com" },
        "amount": 1500.00,
        "type": "income",
        "category": "Salary",
        "date": "2024-06-01T00:00:00.000Z",
        "description": "Monthly salary"
      }
    ],
    "pagination": { "total": 42, "page": 1, "pages": 3, "limit": 20 }
  }
}
```

#### POST `/api/transactions`
```json
// Request
{
  "amount": 250.00,
  "type": "expense",
  "category": "Groceries",
  "date": "2024-06-15",
  "description": "Weekly grocery run"
}

// Response 201
{
  "success": true,
  "message": "Transaction created",
  "data": { "transaction": { "_id": "664f...", "amount": 250, "type": "expense", ... } }
}
```

#### PATCH `/api/transactions/:id`
```json
// Request (partial update — send only changed fields)
{ "amount": 275.50, "description": "Updated grocery total" }

// Response 200
{ "success": true, "message": "Transaction updated", "data": { "transaction": { ... } } }
```

#### DELETE `/api/transactions/:id`
```json
// Response 200 (soft delete — sets isDeleted: true)
{ "success": true, "message": "Transaction deleted" }
```

---

### Dashboard

#### GET `/api/dashboard/summary`
```json
// Response 200
{
  "success": true,
  "message": "Summary fetched",
  "data": {
    "totalIncome": 5200.00,
    "totalExpenses": 3100.00,
    "netBalance": 2100.00,
    "transactionCount": 18
  }
}
```

#### GET `/api/dashboard/category-totals`
```json
// Response 200
{
  "data": {
    "categories": [
      {
        "category": "Salary",
        "categoryTotal": 5200,
        "breakdown": [{ "type": "income", "total": 5200, "count": 2 }]
      },
      {
        "category": "Groceries",
        "categoryTotal": 800,
        "breakdown": [{ "type": "expense", "total": 800, "count": 5 }]
      }
    ]
  }
}
```

#### GET `/api/dashboard/monthly-trends?months=6`
```json
// Response 200
{
  "data": {
    "trends": [
      {
        "year": 2024, "month": 1, "period": "2024-01",
        "breakdown": [
          { "type": "income", "total": 2600, "count": 1 },
          { "type": "expense", "total": 1400, "count": 7 }
        ]
      }
    ]
  }
}
```

#### GET `/api/dashboard/recent?limit=5`
```json
// Response 200
{
  "data": {
    "transactions": [ { "_id": "...", "amount": 250, "type": "expense", ... } ]
  }
}
```

---

### Users (Admin only)

#### GET `/api/users?role=analyst&status=active&page=1&limit=10`
#### GET `/api/users/:id`
#### PATCH `/api/users/:id` — `{ "role": "admin", "status": "inactive" }`
#### DELETE `/api/users/:id` — cascades to delete user's transactions

---

## Error Responses

All errors follow this shape:

```json
{ "success": false, "message": "Human-readable error description" }
```

| Status | When                                               |
|--------|----------------------------------------------------|
| 400    | Invalid input / validation failure / bad ObjectId  |
| 401    | Missing, expired, or invalid JWT                   |
| 403    | Authenticated but insufficient role or not owner   |
| 404    | Resource not found                                 |
| 409    | Conflict (duplicate email)                         |
| 429    | Rate limit exceeded                                |
| 500    | Unexpected server error                            |

---

## Key Design Decisions

### 1. Role Hierarchy vs Explicit Lists
`authorize()` uses a rank array (`['viewer','analyst','admin']`) instead of
checking roles one by one. This means an admin automatically satisfies any
lower-ranked requirement — no need to write `authorize('analyst', 'admin')`
everywhere.

### 2. Ownership Middleware as a Separate Layer
Ownership checks live in their own middleware (`ownership.js`) rather than
inside controllers. This separates concerns cleanly and lets the loaded
document be reused in the controller via `req.transaction` without a second
DB query.

### 3. Soft Deletes on Transactions
Transactions are marked `isDeleted: true` rather than removed. This preserves
audit history, allows recovery, and keeps dashboard aggregations accurate for
historical reporting. The `.active()` query helper filters them out
transparently everywhere.

### 4. DB-level Aggregation for Dashboard
All dashboard endpoints use MongoDB aggregation pipelines instead of loading
documents into JS and computing totals in application code. This keeps memory
usage low and moves computation to the DB — especially important for large
datasets.

### 5. Minimal JWT Payload
The token only carries the user's `_id`. Role and status are re-fetched from
the DB on every request. This means deactivating a user or changing their role
takes effect immediately — no waiting for token expiry.

### 6. Consistent Error and Response Envelopes
Every success response uses `{ success, message, data }` and every error uses
`{ success, message }`. Clients only need to check one field (`success`) to
branch their handling logic.
