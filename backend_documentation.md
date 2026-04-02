# Backend Documentation (Robinson Mall Rewards)

## Overview
The backend is built with Django and Django REST Framework (DRF) to provide a robust API for the frontend. It uses SQLite as its database and `django-rest-framework-simplejwt` for Authentication.

### Key Aspects:
- **Authentication**: JWT (JSON Web Tokens). Handled via SimpleJWT.
- **Roles**: Enforced explicitly by role-based string markers (`admin`, `manager`, `staff`, `customer`) on a custom User model extending `AbstractUser`.
- **Primary Modules**: Vouchers, Campaigns, Claims, Stores, Notifications.

---

## 1. Database Data Models (`api/models.py`)

- **User**: Extends Django's `AbstractUser`. Stores credentials, `phone_number`, customized `role`, and a custom `password_reset_token`.
- **Store**: Defines participating mall businesses. Contains `name`, `location`.
- **Voucher**: Defines discount definitions (e.g. 50% Fashion Voucher). Contains logic like `usage_limit`, `usage_count`, and boolean `is_active`.
- **Campaign**: Wraps a voucher with timing logic. Keeps track of business metrics (`budget`, `reach`, `conversions`, `start_date`, `end_date`). Changes state automatically (`Scheduled`, `Active`, `Completed`).
- **Claim**: Represents a customer redeeming or attempting to redeem a voucher at a store. Requires `amount` and `receipt_no`. Tracking validation status (`Pending`, `Approved`, `Rejected`).
- **Notification**: Alerts mechanism triggered by database signals (e.g. New claims, user registrations). Belongs optionally to specific users (or global if `user_id` is blank). 

---

## 2. API Endpoints Overview (`api/urls.py` & ViewSets)

### Authentication
- `POST /api/users/login/` - Issues Access and Refresh tokens (Customized response to include role).
- `POST /api/users/register/` - Registers a new user.
- `POST /api/users/password-reset-request/` - Accepts an email, generates token, sends email link via SMTP.
- `POST /api/users/password-reset/<token>/` - Updates password according to token.

### Primary Resources (CRUD via ViewSets)
| ViewSet / Path | Description |
|---|---|
| `GET/POST /api/users/` | Manage User Data |
| `GET/POST /api/vouchers/` | Manage Voucher Types | 
| `GET/POST /api/campaigns/` | Fetch/Manage Campaigns. Overrides `get_queryset` to auto-update statuses dynamically based on dates. |
| `GET/POST /api/stores/` | Manage participating stores. |
| `GET/POST /api/claims/` | Manage Customer claims. Filters supported via URL params (`status` and `user_id`). |
| `GET/POST /api/notifications/` | Pull Global OR User-specific notifications. (Plus a `POST /mark_all_as_read/` action). |

### Dashboard Data
- `GET /api/dashboard-stats/` - Aggregate complex metrics to drive chart data. Accumulates total/approved claims, calculates 6-month historical activity, and generates campaign claim distributions.

---

## 3. Signals & Automation (`api/models.py`)

Using Django's `post_save` `@receiver` decoractors, the backend operates several automated side effects:
- **`create_claim_notification`**: When a new `Claim` is saved, automatically generates a global Admin Notification and a specific User success Notification.
- **`create_user_notification`**: Alerts Admins to a new 'customer' registration for manual profile validation/info.
- **`create_campaign_notification`**: Globally announces new active campaigns via the notification layer.
