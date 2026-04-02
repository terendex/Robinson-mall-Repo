# Frontend Documentation (Robinson Mall Rewards)

## Overview
The frontend is a single-page application (SPA) built with **React**, utilizing **React Router** for navigation and **Axios** for API communication. It's designed heavily around Role-Based Access Control (RBAC), offering dedicated layouts and views for four distinct roles: Admin, Manager, Staff, and Customer.

### Key Aspects:
- **Routing**: `react-router-dom` handles conditional rendering and redirects based on user login status and role.
- **State Management**: React's primitive `useState` alongside LocalStorage tokens for persistent authentication.
- **Styling**: Standard CSS files modularity mapped in `/src/css/` (e.g. `App.css`, `Customer.css`).

---

## 1. Application Architecture (`src/App.jsx`)

`App.jsx` acts as the root orchestrator.
- **Authentication Interceptor**: Globally configures Axios to automatically attach the `accessToken` (from LocalStorage) as a Bearer Token to all outgoing requests (except for `/login` and `/register`).
- **Route Protection**: The router verifies if `user` state exists and matches the required role for `/admin`, `/manager`, `/staff`, and `/customer` paths. If not authenticated, unauthenticated paths are triggered, or redirect to `/login` occurs.
- **Login Flow**: An `handleLogin` function resides here which connects to the backend and saves `accessToken` and `refreshToken` upon success.

---

## 2. Directory Structure

- **/components**: Shared, reusable UI elements.
  - `Header.jsx`: The top navigation bar, often dynamic based on the logged-in user or their associated layout.
  - `Sidebar.jsx` (or similarly contained in Layouts): Left-side navigation handling sub-routing within modules.

- **/pages**: Main view components broken out extensively by role.
  - **/admin**: Pages full of granular controls (`AdminDashboard`, `Vouchers`, `Claims`, `Users`, `Settings`). High-level management.
  - **/manager**: Similar but functionally distinct subset (`ManagerDashboard`, `ManagerCampaigns`, `Settings`). Overseer of processes without root controls.
  - **/staff**: Day-to-day operations (`StaffVouchers`, `StaffClaims`). Data entry, claim viewing, handling basic transactions.
  - **/customer**: End-user face (`CustomerDashboard`, `CustomerCampaigns`, `CustomerClaims`). Highly stylized, visually premium.

- **/css**: Dedicated modular stylesheets. Provides clean separation (e.g. keeping Customer dashboard styles perfectly separated from Admin dashboard aesthetics).

---

## 3. Data Fetching Strategy

Fetching happens at the page or component level, almost exclusively utilizing `useEffect` hooks linked with Axios queries pointing to `/api/...`.
- **Interceptors**: Make explicit token-passing redundant. 
- **Roles**: Because the token is passed silently, the backend accurately restricts records. The frontend simply catches the JSON responses and maps them over lists, tables, and metric cards.
