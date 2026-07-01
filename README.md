# Picking App

A dedicated React-based picking interface for the Order Management System (OMS) built on Apache OFBiz. This application helps warehouse personnel view, select, and process picklists efficiently.

## Features

- **JWT Authentication**: Secure login integrated with OFBiz user accounts (`/rest/auth/token`).
- **Facility Selection**: Choose the active warehouse/facility for picking operations.
- **Order Queue**: View pending orders to pick and generate new picklists from selected orders.
- **Active Picklist Processing**: Step-by-step picking interface to view item details, validate quantities, and mark picklist items as complete.
- **Barcode Validation Support**: Designed for easy integration with scanning hardware.

## Tech Stack

- **Framework**: React 19 + Vite 8
- **Routing**: React Router 7
- **Icons**: Lucide React
- **API Integration**: REST/JSON API endpoints on Apache OFBiz

## Prerequisites

Before running the application, make sure you have:

- **Node.js**: v18 or higher (using `pnpm` or `npm` as the package manager)
- **Apache OFBiz**: A running instance with REST API components enabled.

## Getting Started

### 1. Installation

Install project dependencies using your preferred package manager:

```bash
npm install
# or
pnpm install
```

### 2. Configuration

Create a `.env` or `.env.local` file in the root directory to configure the backend API endpoint:

```env
# Leave empty for local development (uses Vite dev server proxy to avoid CORS issues)
VITE_API_BASE_URL=
```

#### Development vs. Production API Routing
- **Development**: Leave `VITE_API_BASE_URL` empty. The app makes requests to the same origin (e.g. `http://localhost:5173/rest/...`), which the Vite dev server proxy (defined in `vite.config.js`) forwards to the OFBiz backend (`http://localhost:8080`), bypassing browser CORS policies.
- **Production**:
  - **Same-Domain (Recommended)**: Serve built static files from the same domain as the OFBiz backend (relative URLs naturally route to the correct server).
  - **Cross-Domain**: Set `VITE_API_BASE_URL` to the production backend API URL (e.g. `https://api.yourdomain.com`). In this scenario, make sure to add your frontend domain to the `cors.origins.allowed` property in the backend `security.properties`.

### 3. Development Server

Start the local development server:

```bash
npm run dev
# or
pnpm dev
```

Open your browser and navigate to the address shown in your terminal (typically `http://localhost:5173`).

### 4. Build for Production

Compile and minify the application for production deployment:

```bash
npm run build
# or
pnpm build
```

The output will be generated in the `dist/` directory, ready to be served by OFBiz or a web server like Nginx.

## API Integration

The picking app communicates with the Apache OFBiz backend using standard JAX-RS REST services:

- **Authentication**: `POST /rest/auth/token` (using Basic Auth to obtain a JWT)
- **Retrieve Orders**: `GET /rest/services/getOrdersToPick`
- **Create Picklist**: `POST /rest/services/createPicklistFromOrders`
- **Picklist Details**: `GET /rest/services/getPicklistDetails`
- **Complete Pick**: `POST /rest/services/setPicklistItemToComplete`

## License

This project is licensed under the Apache License 2.0.
