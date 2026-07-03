# OFbiz Picking PWA - Setup & User Guide

A dedicated React-based Progressive Web App (PWA) built to streamline warehouse order picking for Apache OFBiz. Designed for mobile devices and industrial hardware scanners.

---

## 1. Prerequisites

Make sure the following are installed:
- **Node.js**: v18.x or higher
- **Package Manager**: `pnpm` (recommended) or `npm`
- **Apache OFBiz Backend**: A running instance with JAX-RS REST services enabled.

---

## 2. Local Development Setup

To run and test the application on a local development machine:

### A. Install Dependencies
```bash
pnpm install
```

### B. Configure Local Environment
Create a `.env` file in the root directory:
```env
# Leave empty to use local Vite dev server proxy (fowards to localhost:8080)
VITE_API_BASE_URL=
```
*Vite's configuration handles proxying `/rest/*` requests to `http://localhost:8080/rest/*` to bypass CORS.*

### C. Start Development Server
```bash
pnpm dev
```
- **Local URL**: `http://localhost:5173`
- *Note: PWA offline caching is bypassed in development mode.*

---

## 3. Production Deployment & Configuration

### Step 1: Set the API Base URL
Decide on your API routing strategy and configure `.env`:

* **Option A: Same-Origin Deployment (Recommended)**
  If hosting static files on the same domain/port as the OFBiz backend:
  ```env
  VITE_API_BASE_URL=
  ```
* **Option B: Cross-Origin Deployment**
  If hosting the PWA on a separate domain (e.g. `https://picking.yourdomain.com`):
  ```env
  VITE_API_BASE_URL=https://api.yourdomain.com
  ```
  Also, add the frontend origin to `cors.origins.allowed` in the backend's [`security.properties`](file:///Users/arun/personal/arun/ofbiz-framework/framework/security/config/security.properties):
  ```properties
  cors.origins.allowed=https://picking.yourdomain.com
  ```

### Step 2: Compile & Local Preview
```bash
pnpm build      # Compiles code into the 'dist/' folder
pnpm preview    # Starts a local preview server at http://localhost:4173 to test offline caching/PWA features
```

### Step 3: Deploy Static Files
- Upload the contents of the generated `dist/` directory to your web server (e.g., Nginx, Apache, AWS S3).
- **IMPORTANT**: The server **must serve the application over HTTPS** for Service Workers, barcode camera scanners, and PWA installs to work.

---

## 4. Backend JWT Keys Setup

Manage secret keys in [`framework/security/config/security.properties`](file:///Users/arun/personal/arun/ofbiz-framework/framework/security/config/security.properties):

1. **`security.token.key`**: Used to sign and verify JSON Web Tokens (JWTs) generated during PWA login (`POST /rest/auth/token`).
2. **`login.secret_key_string`**: Used to sign temporary security tokens (e.g. password resets).

> [!WARNING]
> **Production security**: You **MUST NOT** use default keys in production. Generate cryptographically secure 512-bit keys by running:
> ```bash
> ./gradlew generateSecretKeys
> ```
> Update both property values in your production `security.properties` with the generated keys.

---

## 5. User Workflows

- **Login & Facility**: Log in with standard OFBiz credentials. Select your active warehouse facility.
- **Order Queue**: Select pending orders and click **Create Picklist** to group them into a picking run.
- **Scan Picking**: Open your active picklist and click **Start Pick** or **Scan Item**.
  - Items are sorted by walking path efficiency: **Aisle** $\rightarrow$ **Section** $\rightarrow$ **Level**.
  - Scan product barcodes using a **Camera Scanner** or a connected **Hardware Scanner** (Bluetooth/USB).
  - Quantity tracking increments automatically on valid scan.
  - Click **Skip Item** to send an item to the end of the sequence list.
- **Success Loop**: Upon pick completion, review stats on the celebration summary screen, and click **Scan Next Picklist** to immediately start the next run.

---

## 6. API Integration Reference

The application communicates with the backend via these JAX-RS REST services:

| HTTP Method | API Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/rest/auth/token` | Authenticate using Basic Auth to obtain a JWT |
| `GET` | `/rest/services/getOrdersToPick` | Retrieve pending orders in the facility queue |
| `POST` | `/rest/services/createPicklistFromOrders` | Generate a new picklist from selected orders |
| `GET` | `/rest/services/getPicklistDetails` | Retrieve detailed items list for a picklist |
| `POST` | `/rest/services/setPicklistItemToComplete` | Mark picklist item status as picked/complete |
| `GET` | `/rest/services/getPickingPicklists` | Query active picklists in the facility |
| `POST` | `/rest/services/cancelPickingPicklist` | Cancel a picking run |
| `GET` | `/rest/services/getPickingPicklistPdf` | Download printable picklist PDF |
