# Walleto Backend

Walleto is a full-stack digital wallet application that provides users with a secure platform for managing wallets, funding sources, beneficiaries, transfers, deposits, withdrawals, and transaction history.

This repository contains the **NestJS backend API** for Walleto. It provides authentication, wallet operations, transaction processing, OTP verification, account management, and administrative functionality.

## Tech Stack

- **NestJS** 11
- **TypeScript**
- **Prisma ORM** 6.19.3
- **PostgreSQL**
- **JWT** authentication
- **bcrypt** password hashing
- **class-validator** / **class-transformer**
- **Swagger / OpenAPI**
- **Jest**
- **Docker**

## Core Features

### Authentication

- User registration
- User login
- JWT-based authentication
- Password hashing with bcrypt
- Password change
- Protected API routes
- Account status checks

### Wallet Management

- Wallet creation
- Wallet balance management
- Wallet information retrieval
- Supported currency handling

### Transactions

- Deposits
- Withdrawals
- Internal Walleto transfers
- External beneficiary transfers
- Transaction history
- Transaction status management
- Balance validation
- Self-transfer prevention

### OTP Security

Sensitive transaction operations use OTP verification.

OTP challenges are associated with:

- User
- Purpose
- Expiration
- Attempt limits
- Transaction metadata
- Hashed OTP values
- One-time usage

OTP challenges are claimed atomically to prevent reuse.

### Beneficiaries

Users can manage external transfer beneficiaries.

Beneficiary information supports:

- Beneficiary/account name
- Bank information
- Account number
- Routing information
- Account type
- Address information where required

External beneficiary transfers can remain pending until administrative approval.

### Funding Sources

The API supports managing funding sources used for wallet operations, with ownership and account-status checks applied to sensitive operations.

### Account Management

Users can:

- View their profile
- Change their password
- View account information
- Manage account-related resources

Suspended accounts can still access permitted account information and history but cannot perform restricted financial operations.

### Administration

Administrative functionality includes:

- Role-based access control
- User management
- Account suspension
- Account activation
- Transaction review
- Transaction approval
- Transaction rejection

Administrative endpoints are protected using role guards.

---

## Architecture

The backend follows a modular NestJS architecture:

```text
Client
  │
  ▼
Controllers
  │
  ▼
Services
  │
  ▼
Prisma
  │
  ▼
PostgreSQL
```

Authentication and authorisation are enforced through JWT authentication, guards, DTO validation, and account-status checks.

Financial operations that modify balances or create transactions are handled using database transactions to maintain consistency.

## Database

Walleto uses PostgreSQL with Prisma ORM.

The main database entities include:

```text
User
Wallet
FundingSource
Beneficiary
Transaction
OtpChallenge
```

Important enums include:

```text
Role
Currency
FundingSourceType
OtpPurpose
AccountStatus
BeneficiaryType
AccountType
TransactionType
TransactionStatus
```

Prisma schema:

```text
prisma/schema.prisma
```

## Project Structure

The backend is organised around NestJS modules and application services.

```text
backend/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
│
├── src/
│   ├── ...
│   └── main.ts
│
├── test/
├── Dockerfile
├── .dockerignore
├── package.json
└── tsconfig.json
```

`main.ts` configures:

- Global request validation
- CORS
- Swagger
- Application port
- API bootstrap configuration

## Environment Variables

Create a `.env` file for local development.

Example:

```env
FRONTEND_URL=http://localhost:3001
DATABASE_URL="postgresql://ochiagha:3634@localhost:5432/digital_wallet_db"
JWT_SECRET=development-secret
JWT_EXPIRES_IN=1h
PORT=3000
```

### Variables

| Variable         | Description                     |
| ---------------- | ------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string    |
| `JWT_SECRET`     | Secret used to sign JWTs        |
| `JWT_EXPIRES_IN` | JWT expiration period           |
| `FRONTEND_URL`   | Frontend origin allowed by CORS |
| `PORT`           | Backend HTTP port               |

Do not commit
