# OFbiz Picking PWA - Setup & User Guide

Welcome to the **OFbiz Picking PWA** project! This repository contains a dedicated React-based picking interface for the Order Management System (OMS) built on Apache OFBiz. It is designed to help warehouse personnel view, select, and process picklists efficiently on mobile devices and industrial hardware scanners.

---

## 1. System Overview

The **Picking PWA** is a responsive React Single Page Application (SPA) that communicates with the **Apache OFBiz** backend via standard JAX-RS REST services (under the `/rest/` endpoint) to process order picking workflows.

---

## 2. General Prerequisites

Before setting up the project, make sure the following are installed:

1. **Node.js**: Version 18.x or higher.
2. **Package Manager**: `pnpm` is highly recommended (as lockfiles are already configured), but `npm` or `yarn` can also be used.
   - *To install pnpm globally*: `npm install -g pnpm`
3. **Apache OFBiz Backend**: A running instance of the Apache OFBiz server with REST API components enabled.
4. **Git**: For version control.

---

## 3. Development Environment Setup (Local Testing)

Follow these steps to set up and run the application on a local development machine:

### Step 1: Clone & Install Dependencies
Open your terminal, navigate to the `picking-app` root directory, and run:
```bash
pnpm install
```

### Step 2: Configure Local Environment
Create a `.env` file in the root of the project to enable Vite's local dev server proxy:
1. Create a file named `.env` in the `picking-app/` root directory.
2. Configure it with an empty base URL:
   ```env
   # Leave EMPTY for local development (uses the local Vite server proxy)
   VITE_API_BASE_URL=
   ```
   *Vite's configuration (`vite.config.js`) will automatically proxy all local `/rest/*` requests to your local OFBiz server (`http://localhost:8080/rest/*`), preventing browser CORS issues.*

### Step 3: Run the Development Server
```bash
pnpm dev
```
- **Access URL**: `http://localhost:5173`
- **Key Features in Dev Mode**:
  - **Hot Module Replacement (HMR)**: Changes to React components or styles are updated in the browser instantly on save.
  - **Code Quality**: Run `pnpm lint` to check for style violations.
  - **Offline limitations**: Service Worker caching and PWA offline loading are **disabled/bypassed** in dev mode (Vite serves modules dynamically on demand, which cannot be cached offline).

---

## 4. Production Environment Setup (Deployment & Go-Live)

Follow these steps to compile, configure, and deploy the application to a production environment:

### Step 1: Choose API Integration Strategy
Configure how the frontend PWA routes requests to the production OFBiz server. Choose **one** of the following strategies:

#### Option A: Same-Origin Deployment (Recommended)
Host the frontend static files on the same domain and port as the OFBiz backend (e.g. using a reverse proxy like Nginx, or hosting them inside OFBiz's Webapp directory).
- **Configure `.env`**:
  ```env
  VITE_API_BASE_URL=
  ```
- **Benefit**: No Cross-Origin Resource Sharing (CORS) setup is needed. Relative URLs automatically route to the correct API host.

#### Option B: Cross-Origin Deployment
Host the frontend PWA on a separate domain (e.g., `https://picking.yourdomain.com`) from your backend (e.g., `https://api.yourdomain.com`).
1. **Configure `.env`**:
   ```env
   VITE_API_BASE_URL=https://api.yourdomain.com
   ```
2. **Backend Config**: Add the frontend domain to the allowed origins inside the backend configuration file `security.properties` (located in `framework/security/config/security.properties`):
   ```properties
   # Add your frontend domain to the allowed CORS origins list
   cors.origins.allowed=https://picking.yourdomain.com
   ```

### Step 2: Compile the Production Bundle
Run the compiler to build and minify the code:
```bash
pnpm build
```
- **Build Output**: A `dist/` directory will be generated in the root of the project containing optimized HTML, CSS, JS bundles, and public PWA assets (manifest, icons, and service worker).

### Step 3: Test Production Build Locally (Preview Mode)
Before pushing files to the live server, test PWA behaviors and offline caching locally:
```bash
pnpm preview
```
- **Access URL**: `http://localhost:4173`
- **Key Testing Steps**:
  1. Open `http://localhost:4173` while online (allows the Service Worker to register and cache the production bundles).
  2. Open DevTools -> Network -> toggle to **Offline** mode.
  3. Refresh the page. Verify the entire user interface and shell load successfully without internet.

### Step 4: Deploy Static Files
1. Copy the contents of the generated `dist/` directory to your web hosting provider or server directory (e.g. `/var/www/html` for Nginx, AWS S3 bucket, or your Apache static webapp path).
2. **HTTPS Configuration**: The hosting server **MUST serve the application over HTTPS**. Service workers, camera APIs (for barcode scanning), and PWA installations will not work on non-secure origins (except `localhost`).

---

## 5. Backend Security & JWT Token Configurations

For the PWA to securely authenticate with Apache OFBiz, you must configure secret keys correctly on the backend. These settings are managed in:
`framework/security/config/security.properties`

### Key Parameters:

#### 1. `security.token.key`
* **Purpose**: This is the **primary secret key** used to sign and verify JSON Web Tokens (JWTs). When the PWA logs in (`POST /rest/auth/token`), the backend generates a JWT signed with this key. The PWA then sends this token in the `Authorization: Bearer <token>` header for all subsequent API requests.
* **Format**: Must be a cryptographically secure 512-bit key (64 characters) because OFBiz uses the HMAC512 algorithm for token signatures.

#### 2. `login.secret_key_string`
* **Purpose**: Used to sign and verify temporary security tokens generated by OFBiz (e.g. password resets or single-use verification links).
* **Format**: Must be a cryptographically secure 512-bit key (64 characters).

---

### Key Generation Guidelines:

#### Development Environment:
* For local development, you can use the default keys pre-configured in the repository's `security.properties`.

#### Production Environment (Go-Live):
* **IMPORTANT**: You **MUST NOT** use the default keys in production. Since the default keys are public, anyone could forge a JWT and access the APIs.
* **Generate new keys**: Run the following command in the root of your OFBiz project directory to generate new cryptographically secure random keys:
  ```bash
  ./gradlew generateSecretKeys
  ```
* Copy the output keys and update the values for `security.token.key` and `login.secret_key_string` in your production `security.properties` file.

---

## 6. App Features & User Walkthrough

Once the application is running, here is how to use the workflows:

### A. Login & Zone Selection
1. **Login**: Enter your standard OFBiz credentials. The app requests a secure JWT token from `/rest/auth/token` using Basic Auth.
2. **Facility Selection**: Select the warehouse facility you are working in. This sets the active scope for picking orders.

### B. Order Queue & Picklist Creation
1. Go to the **Order Queue** from the sidebar nav.
2. Select one or more orders from the pending list.
3. Click **Create Picklist** to bundle these orders into a structured picking run.

### C. Processing a Picklist (Scan Picking)
1. Navigate to the **Picklists** screen and open your active picklist.
2. Click **Start Pick** or **Scan Item** at the top right to enter the focused single-item view.
3. The items are automatically sorted by walking path efficiency: **Aisle** $\rightarrow$ **Section** $\rightarrow$ **Level**.
4. **Identify the Item**: Look at the large location indicator badge and the product name/SKU.
5. **Record Pick (Scanning)**:
   - **Camera Scan**: Click "Open Camera Scanner" to scan the product's barcode using the device's camera.
   - **Hardware Scan**: Scan the barcode directly using a Bluetooth/USB hardware scanner (e.g., Zebra, Honeywell). The app automatically listens for fast keyboard inputs.
   - **Manual Confirm**: If a barcode is damaged, use the "Confirm Manual" button.
6. **Quantity Tracker**: The scanner increments the units. When the required quantity is fully matched, it updates the backend automatically using `/rest/services/setPicklistItemToComplete`.
7. **Skip Item**: Click "Skip Item" to push the product to the back of your path sequence to scan it later.

### D. Success Dashboard Loop
1. When all items in a picklist are completed, you are automatically redirected to the **Success Summary** page.
2. The app celebrates completion with confetti animation and displays stats: lines picked, total quantities, and orders packaged.
3. **Continuous Workflow Loop**: If another active picklist exists in the queue, a green **"Scan Next Picklist"** button appears. Click it to immediately start the next run without going back to the main menus, keeping your picking loop seamless.

---

## 7. API Integration Reference

The picking app communicates with the Apache OFBiz backend using standard JAX-RS REST services:

* **Authentication**: `POST /rest/auth/token` (using Basic Auth to obtain a JWT)
* **Retrieve Orders**: `GET /rest/services/getOrdersToPick`
* **Create Picklist**: `POST /rest/services/createPicklistFromOrders`
* **Picklist Details**: `GET /rest/services/getPicklistDetails`
* **Complete Pick**: `POST /rest/services/setPicklistItemToComplete`
* **Get Active Picklists**: `GET /rest/services/getPickingPicklists`
* **Cancel Picklist**: `POST /rest/services/cancelPickingPicklist`
* **Download PDF**: `GET /rest/services/getPickingPicklistPdf`

---

## License

This project is licensed under the Apache License 2.0.
