# Robinson Mall

A full-stack web application for Robinson Mall featuring:
- **Performance Dashboard**: Real-time KPI tracking (Total Claims, Redemption Rate, etc.) and data visualization with **Recharts**.
- **Automated Notification System**: Database-persistent notifications triggered automatically by system events (New Claims, New Customers).
- **Role-based Dashboards**: Tailored experiences for Admin, Manager, Staff, and Customer.
- **User Management**: Authentication, profile management, and password reset via Gmail SMTP.

## Tech Stack

| Layer    | Technology                                                                          |
| -------- | ----------------------------------------------------------------------------------- |
| Frontend | React 19, Vite, Recharts, React Router v7, Axios, FontAwesome, SheetJS (xlsx)       |
| Backend  | Django 6, Django REST Framework, django-cors-headers                                |
| Database | SQLite (with Django Signals for automation)                                         |
| OCR      | Tesseract.js (browser-based, no API key required)                                   |
| Email    | Gmail SMTP                                                                         |

---

## Prerequisites

- **Node.js** ≥ 18 and **npm** (for the frontend)
- **Python** ≥ 3.10 and **pip** (for the backend)

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/terendex/Robinson-mall-Repo.git
cd Robinson-mall-Repo
```

---

### 2. Frontend Setup

Install the frontend dependencies from the project root:

```bash
npm install
```

If you ever need to manually install the specific libraries used in this project (like for charts and routing), run:
```bash
npm install recharts react-router-dom axios@1.14.0 react-icons react-datepicker xlsx tesseract.js
```

---

### 3. Backend Setup

#### a) Create a Python virtual environment

```bash
cd backend
python -m venv venv
```

Activate it:

- **Windows (PowerShell):**
  ```powershell
  .\venv\Scripts\Activate
  ```
- **macOS / Linux:**
  ```bash
  source venv/bin/activate
  ```

#### b) Install Python dependencies

```bash
pip install django djangorestframework django-cors-headers python-dotenv djangorestframework-simplejwt
```

#### c) Configure environment variables

Create a `.env` file inside the `backend/` directory (if one doesn't already exist):

EMAIL_HOST_USER=your_gmail_address@gmail.com
EMAIL_HOST_PASSWORD=your_gmail_app_password
```

#### d) Run database migrations

```bash
python manage.py migrate
```

> This applies all migrations including the `Transaction` model added in migration `0014`.

#### e) Create a superuser (optional — for admin access)

```bash
python manage.py createsuperuser
```

---

## Running the Application

You need **two terminals** — one for the backend and one for the frontend.

### Terminal 1 — Start the Backend Server

```bash
cd backend
python manage.py runserver
```

The API will be available at **http://127.0.0.1:8000/api/**

### Terminal 2 — Start the Frontend Dev Server

From the project root:

```bash
npm run dev
```

The app will be available at **http://localhost:5173/**

---

## Available Scripts

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Start the Vite development server  |
| `npm run build`   | Build the frontend for production  |
| `npm run preview` | Preview the production build       |
| `npm run lint`    | Run ESLint                         |

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/users/` | GET / POST | User management |
| `/api/vouchers/` | GET / POST | Voucher types |
| `/api/campaigns/` | GET / POST | Campaigns (auto status updates) |
| `/api/stores/` | GET / POST | Participating stores |
| `/api/claims/` | GET / POST | Customer voucher claims |
| `/api/transactions/` | GET / POST / PATCH | Transaction audit records |
| `/api/notifications/` | GET / POST | System notifications |
| `/api/dashboard-stats/` | GET | Aggregated KPIs for dashboard & reports |
| `/api/users/login/` | POST | JWT login |
| `/api/token/refresh/` | POST | Refresh access token |

---

## Project Structure

```
Robinson-mall-Repo/
├── backend/                # Django backend
│   ├── api/                # REST API app (models, views, serializers, urls)
│   ├── data/               # Django project settings (settings.py, urls.py)
│   ├── .env                # Environment variables (Gmail credentials)
│   ├── db.sqlite3          # SQLite database
│   └── manage.py           # Django management script
├── src/                    # React frontend source
│   ├── components/         # Reusable components (modals, nav, etc.)
│   ├── pages/              # Page components
│   │   └── admin/          # Admin pages (Dashboard, Reports, Transactions, ...)
│   ├── utils/
│   │   └── exportUtils.js  # Shared CSV + Excel export helpers (SheetJS)
│   ├── css/                # CSS stylesheets per page/component
│   ├── assets/             # Static assets
│   ├── App.jsx             # Root application + routing
│   └── main.jsx            # Entry point
├── public/                 # Public static files
├── index.html              # HTML entry point
├── package.json            # Frontend dependencies & scripts
├── vite.config.js          # Vite configuration
└── eslint.config.js        # ESLint configuration
```
