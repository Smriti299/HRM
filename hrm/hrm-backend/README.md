# 🏢 HRM Backend — Human Resource Management System

A production-ready REST API backend for HR management built with **Node.js**, **Express**, and **MongoDB (Mongoose)**.

---

## 📁 Folder Structure

```
hrm-backend/
├── scripts/
│   └── seed.js                  # Database seed script
├── src/
│   ├── config/
│   │   └── db.js                # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── employeeController.js
│   │   ├── departmentController.js
│   │   ├── attendanceController.js
│   │   ├── leaveController.js
│   │   └── payrollController.js
│   ├── middleware/
│   │   ├── auth.js              # JWT protect + RBAC authorize
│   │   ├── errorHandler.js      # Centralized error handler
│   │   └── validate.js          # express-validator runner
│   ├── models/
│   │   ├── Employee.js
│   │   ├── Department.js
│   │   ├── Attendance.js
│   │   ├── Leave.js
│   │   └── Payroll.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── employeeRoutes.js
│   │   ├── departmentRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── leaveRoutes.js
│   │   └── payrollRoutes.js
│   ├── utils/
│   │   ├── generateToken.js
│   │   └── apiResponse.js
│   ├── validators/
│   │   ├── authValidators.js
│   │   ├── employeeValidators.js
│   │   ├── departmentValidators.js
│   │   ├── attendanceValidators.js
│   │   ├── leaveValidators.js
│   │   └── payrollValidators.js
│   └── app.js                   # Express app entry point
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js >= 18.x
- MongoDB (local or Atlas)

### 1. Clone & Install
```bash
git clone <repo-url>
cd hrm-backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hrm_db
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
NODE_ENV=development
```

### 3. Seed Sample Data
```bash
npm run seed
```

### 4. Run the Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server starts at: `http://localhost:5000`

---

## 🔐 Authentication

All protected routes require a **Bearer token** in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Roles & Permissions

| Role     | Capabilities                                         |
|----------|------------------------------------------------------|
| Admin    | Full access — all modules including delete & payroll |
| HR       | Manage employees, attendance, leaves, generate payroll |
| Employee | View own profile, self check-in/out, apply leave    |

---

## 📡 API Endpoints

### 🔑 Auth — `/api/auth`

| Method | Endpoint               | Access        | Description              |
|--------|------------------------|---------------|--------------------------|
| POST   | `/login`               | Public        | Login and receive JWT    |
| POST   | `/register`            | Admin, HR     | Create a new employee    |
| GET    | `/me`                  | Protected     | Get own profile          |
| PUT    | `/change-password`     | Protected     | Change own password      |

**Login Request:**
```json
POST /api/auth/login
{
  "email": "admin@hrm.com",
  "password": "Admin@123"
}
```

**Login Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "employee": {
      "id": "...",
      "employeeId": "EMP0001",
      "fullName": "Alice Admin",
      "email": "admin@hrm.com",
      "role": "Admin"
    }
  }
}
```

---

### 👤 Employees — `/api/employees`

| Method | Endpoint             | Access        | Description                      |
|--------|----------------------|---------------|----------------------------------|
| GET    | `/`                  | Admin, HR     | List all (pagination + search)   |
| GET    | `/:id`               | Admin, HR, Self| Get single employee profile     |
| PUT    | `/:id`               | Admin, HR     | Update employee                  |
| DELETE | `/:id`               | Admin         | Soft-delete (deactivate)         |
| PUT    | `/me/profile`        | Self          | Update own phone/address         |

**Query Parameters for GET `/`:**
```
?page=1&limit=10&search=ravi&department=<id>&role=Employee&isActive=true
```

---

### 🏢 Departments — `/api/departments`

| Method | Endpoint  | Access    | Description            |
|--------|-----------|-----------|------------------------|
| GET    | `/`       | Protected | List all departments   |
| GET    | `/:id`    | Protected | Get department details |
| POST   | `/`       | Admin     | Create department      |
| PUT    | `/:id`    | Admin     | Update department      |
| DELETE | `/:id`    | Admin     | Delete department      |

**Create Department:**
```json
POST /api/departments
{
  "name": "Product",
  "description": "Product design and management",
  "head": "<employeeId>"
}
```

---

### 📅 Attendance — `/api/attendance`

| Method | Endpoint              | Access        | Description                        |
|--------|-----------------------|---------------|------------------------------------|
| POST   | `/check-in`           | Protected     | Mark own check-in                  |
| POST   | `/check-out`          | Protected     | Mark own check-out                 |
| GET    | `/today/summary`      | Admin, HR     | Today's attendance overview        |
| POST   | `/mark`               | Admin, HR     | Manually mark attendance           |
| GET    | `/:employeeId`        | Protected     | Monthly attendance (use `me` for self) |

**Get Monthly Attendance:**
```
GET /api/attendance/me?month=3&year=2026
GET /api/attendance/<employeeId>?month=3&year=2026
```

**Response includes summary:**
```json
{
  "data": {
    "records": [...],
    "summary": {
      "totalDays": 23,
      "present": 20,
      "absent": 1,
      "halfDay": 1,
      "late": 1,
      "onLeave": 0,
      "totalHours": "179.50"
    }
  }
}
```

---

### 🌴 Leaves — `/api/leaves`

| Method | Endpoint              | Access        | Description                  |
|--------|-----------------------|---------------|------------------------------|
| POST   | `/`                   | Protected     | Apply for leave              |
| GET    | `/`                   | Protected     | List leaves (own or all)     |
| GET    | `/:id`                | Protected     | Get single leave             |
| PUT    | `/:id/review`         | Admin, HR     | Approve or reject leave      |
| PUT    | `/:id/cancel`         | Self          | Cancel pending leave         |
| GET    | `/balance/:employeeId`| Protected     | Get leave balance (use `me`) |

**Apply for Leave:**
```json
POST /api/leaves
{
  "leaveType": "Annual",
  "startDate": "2026-04-10",
  "endDate": "2026-04-12",
  "reason": "Family function",
  "isHalfDay": false
}
```

**Review Leave (Admin/HR):**
```json
PUT /api/leaves/:id/review
{
  "status": "Approved",
  "reviewRemarks": "Approved. Enjoy!"
}
```

**Leave Types:** `Annual` | `Sick` | `Casual` | `Unpaid`

**Default Leave Balance per Employee:**
- Annual: 18 days
- Sick: 12 days
- Casual: 6 days

---

### 💰 Payroll — `/api/payroll`

| Method | Endpoint              | Access    | Description                      |
|--------|-----------------------|-----------|----------------------------------|
| POST   | `/generate`           | Admin, HR | Generate payslip for employee    |
| GET    | `/`                   | Admin, HR | List all payrolls (filters)      |
| GET    | `/summary`            | Admin, HR | Monthly payroll summary          |
| GET    | `/:employeeId`        | Protected | Get payslip (use `me` for self)  |
| PUT    | `/:id/mark-paid`      | Admin     | Mark payroll as paid             |

**Generate Payroll:**
```json
POST /api/payroll/generate
{
  "employeeId": "<mongoId>",
  "month": 3,
  "year": 2026
}
```

**Payslip Response Structure:**
```json
{
  "data": {
    "employee": { "firstName": "Ravi", "employeeId": "EMP0003", ... },
    "month": 3, "year": 2026,
    "workingDaysInMonth": 26,
    "presentDays": 24, "absentDays": 1, "leaveDays": 1, "halfDays": 0,
    "earnings": {
      "basic": 70000, "hra": 28000, "da": 7000, "ta": 4500, "bonus": 0
    },
    "deductions": {
      "pf": 8400, "tax": 4000, "lop": 2692.30, "other": 0
    },
    "grossSalary": 109500,
    "totalDeductions": 15092.30,
    "netSalary": 94407.70,
    "status": "Generated"
  }
}
```

---

## 🛡️ Error Response Format

All errors follow a consistent format:
```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

Validation errors include field details:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Valid email is required" }
  ]
}
```

---

## 🌱 Seed Credentials

After running `npm run seed`:

| Role     | Email           | Password   |
|----------|-----------------|------------|
| Admin    | admin@hrm.com   | Admin@123  |
| HR       | hr@hrm.com      | Hr@12345   |
| Employee | ravi@hrm.com    | Emp@12345  |
| Employee | priya@hrm.com   | Emp@12345  |
| Employee | arjun@hrm.com   | Emp@12345  |

---

## 🧱 Tech Stack

| Layer        | Technology                  |
|--------------|-----------------------------|
| Runtime      | Node.js 18+                 |
| Framework    | Express 4                   |
| Database     | MongoDB + Mongoose 8        |
| Auth         | JWT + bcryptjs              |
| Validation   | express-validator           |
| Security     | helmet, cors                |
| Dev tools    | nodemon, morgan             |

---

## 🔒 Security Features

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with configurable expiry
- Role-based access control on every route
- Helmet for HTTP security headers
- Request body size limit (10kb)
- Input validation on all POST/PUT endpoints
- Soft-delete pattern (no hard data loss)
- Centralized error handler (no stack traces in production)
