# Robinson Mall

A full-stack web application for Robinson Mall featuring:
- **Performance Dashboard**: Real-time KPI tracking (Total Claims, Redemption Rate, etc.) and data visualization with **Recharts**.
- **Automated Notification System**: Database-persistent notifications triggered automatically by system events (New Claims, New Customers).
- **Role-based Dashboards**: Tailored experiences for Admin, Manager, Staff, and Customer.
- **User Management**: Authentication, profile management, and password reset via SendGrid.

## Tech Stack

| Layer    | Technology                                                  |
| -------- | ----------------------------------------------------------- |
| Frontend | React 19, Vite, Recharts, React Router v7, Axios, Lucide/FontAwesome |
| Backend  | Django 6, Django REST Framework, django-cors-headers         |
| Database | SQLite (with Django Signals for automation)                 |
| Email    | SendGrid                                                    |

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
npm install recharts react-router-dom axios react-icons react-datepicker
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
pip install django djangorestframework django-cors-headers python-dotenv django-sendgrid-v5 djangorestframework-simplejwt
```

#### c) Configure environment variables

Create a `.env` file inside the `backend/` directory (if one doesn't already exist):

```env
SENDGRID_API_KEY=your_sendgrid_api_key_here
DEFAULT_FROM_EMAIL=your_email@example.com
```

#### d) Run database migrations

```bash
python manage.py migrate
```

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

## Project Structure

```
Robinson-mall-Repo/
├── backend/                # Django backend
│   ├── api/                # REST API app (models, views, serializers, urls)
│   ├── data/               # Django project settings (settings.py, urls.py)
│   ├── .env                # Environment variables (SendGrid keys)
│   ├── db.sqlite3          # SQLite database
│   └── manage.py           # Django management script
├── src/                    # React frontend source
│   ├── components/         # Reusable React components
│   ├── pages/              # Page components (admin, manager, staff, customer)
│   ├── styles/             # CSS stylesheets
│   ├── assets/             # Static assets
│   ├── App.jsx             # Root application component
│   └── main.jsx            # Entry point
├── public/                 # Public static files
├── index.html              # HTML entry point
├── package.json            # Frontend dependencies & scripts
├── vite.config.js          # Vite configuration
└── eslint.config.js        # ESLint configuration
```
