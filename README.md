# Robinson Mall Rewards & Loyalty Portal

A secure, full-stack rewards and loyalty system for **Robinson Mall**. This application is designed with a premium, responsive interface and a hardened backend API, supporting custom role-based dashboards, automated signals/alerts, and real-time scanning.

---

## Key Features

- **Performance Dashboard**: Real-time KPI tracking (Total Claims, Redemption Rate, Active/Scheduled Campaigns, Live Reach) and dynamic data visualization using **Recharts**.
- **Role-Based Dashboards & Layouts**: Tailored permissions, workflows, and UI experiences for **Admin**, **Manager**, **Staff**, and **Customer** roles.
- **Hardware-Integrated QR Scanning**: Browser-based scanning powered by `html5-qrcode` for staff to verify and redeem customer voucher claims via webcam/mobile cameras.
- **Automated Notifications**: Event-driven notification system driven by Django signals (e.g., registration alerts, campaign launches, pending claims).
- **Hardened Security**: Systematically audited backend views, serialization constraints, and database-level synchronization to prevent exploit vectors and race conditions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Recharts, React Router v7, Axios, FontAwesome, SheetJS (xlsx), `html5-qrcode` |
| **Backend** | Django 6, Django REST Framework, django-cors-headers, SimpleJWT |
| **Database** | SQLite (optimized with transaction blocks and write-locks) |
| **OCR & Scanning** | `html5-qrcode` (web-based scanning), Tesseract.js (optional receipt OCR) |
| **Email** | Gmail SMTP for password resets |

---

## Prerequisites

- **Node.js** &ge; 18 and **npm** (for the frontend)
- **Python** &ge; 3.10 and **pip** (for the backend)

---

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/terendex/Robinson-mall-Repo.git
cd Robinson-mall-Repo
```

### 2. Frontend Setup
From the project root:
```bash
npm install
```

If you need to install frontend dependencies manually:
```bash
npm install recharts react-router-dom axios@1.14.0 react-icons react-datepicker xlsx tesseract.js html5-qrcode
```

### 3. Backend Setup
Navigate to the backend directory and create a virtual environment:
```bash
cd backend
python -m venv venv
```

Activate the environment:
- **Windows (PowerShell):**
  ```powershell
  .\venv\Scripts\Activate
  ```
- **macOS / Linux:**
  ```bash
  source venv/bin/activate
  ```

Install Python requirements:
```bash
pip install django djangorestframework django-cors-headers python-dotenv djangorestframework-simplejwt
```

Create a `.env` file inside `backend/` to configure SMTP email (for password reset functionality):
```env
EMAIL_HOST_USER=your_gmail_address@gmail.com
EMAIL_HOST_PASSWORD=your_gmail_app_password
FRONTEND_URL=http://localhost:5173
```

Run database migrations:
```bash
python manage.py migrate
```

Create a superuser (for admin access):
```bash
python manage.py createsuperuser
```

### 4. Seed Developer Accounts (Optional)
To populate the database with a full set of pre-configured accounts and mock data (stores, campaigns, claims, transactions), run:
```bash
python manage.py seed_all
```
Alternatively, to seed only the user accounts, run:
```bash
python manage.py seed_users
```

Below are the pre-configured placeholder credentials available for testing each role and their specific workflows:

#### Core Role-Based Accounts
These accounts are ideal for testing general permissions and default layouts:

| Role | Email | Password | Purpose / Notes |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `RobinsonMall@2026` | Access to entire portal, user management, and advanced statistics. |
| **Manager** | `manager@example.com` | `managerpassword` | Create campaigns, manage stores, view dashboard statistics. |
| **Staff** | `staff@example.com` | `staffpassword` | Scan/redeem vouchers, lookup claims, manage participating stores. |
| **Customer** | `customer@example.com` | `customerpassword` | Submit voucher claims, view personal transactions and notifications. |

---

## Running the Application

### Terminal 1: Backend API
```bash
cd backend
python manage.py runserver
```
*API Gateway:* `http://127.0.0.1:8000/api/`

### Terminal 2: Frontend Dev Server
From the project root:
```bash
npm run dev
```
*Frontend Portal:* `http://localhost:5173/`

---

## Project Architecture & Directory Structure

```
Robinson-mall-Repo/
├── backend/                # Django REST API application
│   ├── api/                # Core REST API (models, views, serializers, permissions, signals)
│   │   ├── backends.py     # Custom authentication backend (active checking)
│   │   ├── permissions.py  # Granular Role-Based Access Control (RBAC) classes
│   │   ├── models.py       # Database models with event hooks (Signals)
│   │   ├── serializers.py  # Data validation and serialization rules
│   │   ├── views.py        # Controller ViewSets with transaction handling
│   │   └── urls.py         # REST Endpoint mappings
│   ├── data/               # Project configuration settings and URL configurations
│   ├── db.sqlite3          # SQLite database instance
│   └── manage.py           # Django command-line execution script
├── src/                    # React SPA Frontend
│   ├── components/         # Reusable UI elements (modals, navigations, scanners)
│   │   └── RedeemVoucherPanel.jsx  # QR code scanning and verification panel
│   ├── pages/              # Routed pages segregated by role (admin, manager, staff, customer)
│   ├── css/                # Modular styling files mapped to layouts
│   ├── utils/              # Shared utility scripts (e.g., exportUtils for CSV/Excel)
│   ├── App.jsx             # Main router configuration & axios token interceptors
│   └── main.jsx            # React root mount entry point
├── package.json            # NPM scripts & package dependencies
└── vite.config.js          # Vite compilation settings
```

---

## API Endpoints

| Endpoint | Method | Allowed Roles | Description |
|---|---|---|---|
| `/api/users/login/` | `POST` | Any | JWT login, returns token pair + user role information. |
| `/api/users/register/` | `POST` | Any | Customer self-registration endpoint. |
| `/api/users/password-reset-request/` | `POST` | Any | Initiates secure email password reset workflow. |
| `/api/users/password-reset/<uidb64>/<token>/` | `GET/POST` | Any | Validates token and updates user password. |
| `/api/users/` | `GET / POST` | Admin / Manager / Staff | Lists users based on role permissions. |
| `/api/users/me/` | `GET / PATCH` | Authenticated | Views or edits the requesting user's profile. |
| `/api/vouchers/` | `GET / POST` | Authenticated (Read), Staff+ (Write) | Manages available voucher discount templates. |
| `/api/campaigns/` | `GET / POST` | Authenticated (Read), Manager+ (Write) | Creates and tracks campaigns. |
| `/api/stores/` | `GET / POST` | Authenticated (Read), Staff+ (Write) | Participating businesses list. |
| `/api/claims/` | `GET / POST` | Customer (Self), Staff+ (All) | Customer voucher claims. |
| `/api/claims/lookup/` | `GET` | Staff / Manager / Admin | Looks up claims by QR scanner text or reference ID. |
| `/api/claims/<id>/redeem/` | `PATCH` | Staff / Manager / Admin | Approves or rejects a pending claim, generating a TXN. |
| `/api/transactions/` | `GET / POST` | Customer (Own), Staff+ (All) | Transaction logs for financial auditing. |
| `/api/transactions/<id>/update_status/` | `PATCH` | Staff / Manager / Admin | Updates transaction statuses (e.g., Rejecting/Cascading). |
| `/api/notifications/` | `GET` | Authenticated | Fetches user-specific or global notification alerts. |
| `/api/dashboard-stats/` | `GET` | Manager / Admin | Aggregated metrics, KPI analytics, and Recharts sources. |

---

## Critical Security Hardening & Auditing

The system backend has been secured against typical multi-user race conditions, access bypasses, and validation errors:

### 1. TOCTOU & Concurrency Control
- **Claim Creation**: A row-level database write-lock (`select_for_update()`) is acquired on the selected `Voucher` before evaluating claims. This prevents multiple concurrent claims from exceeding a voucher's designated `usage_limit`.
- **Claim Redemption**: The target claim is locked using `select_for_update()` during redemption. The linked voucher is also locked concurrently. This stops two staff members from approving the same claim or exceeding the campaign budget in separate tabs.
- **SQLite Atomic Updates**: SQLite WAL mode does not implement true row-level write-locks. For transaction status changes, we utilize a conditional single-query update filter (`status='Pending'`). Only one concurrent request updates the row; subsequent attempts update zero rows and fail gracefully with a `400 Bad Request`.

### 2. Double-Claiming & Duplicate Prevention
- **Receipt Uniqueness**: Customer receipts or Invoice numbers (SI) are checked globally on the `Transaction` model. Once an SI is approved, any attempt to use the same invoice number for subsequent voucher claims/redemptions is blocked, preventing duplicate claim exploits.

### 3. User & Authentication Integrity
- **Password Reset Protection**: 
  - To prevent user enumeration, requests to the reset-link endpoint return identical success messages whether the email exists in the database or not.
  - Links are encoded with custom cryptographic tokens that expire after 5 minutes.
  - The link is invalidated immediately upon successful password change by force-updating the user's `last_login` timestamp, changing the HMAC verification base.
- **Profile Self-Update Constraints**: Callers updating their profiles through the `/api/users/me/` endpoint cannot modify their own roles, active status (`is_active`), or superuser flags, eliminating client-side privilege escalation vectors.
- **Disabled Account Guards**: Inactive users (`is_active=False`) are blocked from authenticating even if correct credentials are provided, preventing suspended users from accessing the API.

### 4. Privacy & RBAC Isolation
- **Manager Data Isolation**: Managers are barred from viewing other Manager profiles to prevent cross-role PII leakage. Their queries are filtered to see only `Staff` and `Customer` details.
- **Notification Isolation**: Notifications are queried exclusively for the logged-in user. Any attempt to update, delete, or retrieve another user's alert by guessing its PK is blocked.

---

## Core System Lifecycles & Workflows

### 1. The QR Code Scanner Lifecycle
- The frontend barcode scanner is handled by `RedeemVoucherPanel.jsx` using `html5-qrcode`.
- **Camera State Tracker**: The component implements a ref-based state machine (`stopped` &rarr; `starting` &rarr; `scanning` &rarr; `stopping`) to manage async camera initializations and releases.
- **Resource Cleanup**: When switching between text inputs and camera scanning, or when the component unmounts during routes/tab changes, the scanner releases the camera stream resource using `.stop()`. This prevents hardware resource locks, ensuring cameras like the *Razer Kiyo* are not locked in an active stream state.
- **Collision Protection**: If the component is unmounted while the camera is still in the `starting` phase, an abort interceptor catches the initialization success and triggers an immediate shutdown.

### 2. Voucher vs. Transaction Architecture
- **Voucher Model**: Defines the template for discounts (e.g., 20% off at Sports & Fitness). It tracks mutable fields like `usage_limit` and active status.
- **Transaction Model**: Serves as a persistent audit log recording actual redemptions. It stores de-normalized fields (`user_name`, `voucher_name`, `store_name`, `receipt_no`, and `amount`). If a Voucher or Store is deleted or modified later, the audit trail remains unaltered.
- **Status Cascade**: If a previously approved transaction is marked as `Rejected` by a manager, the system triggers a cascade that marks the associated Claim as `Rejected` and decrements the Voucher's `usage_count` to restore the consumed slot.
