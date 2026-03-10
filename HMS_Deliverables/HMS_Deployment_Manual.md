# 🏥 HMS Enterprise v3.0 - Deployment Manual

## 1. Prerequisites
- **Node.js**: v18 or higher.
- **PostgreSQL**: v14 or higher.
- **Git** (Optional).

## 2. Installation
1.  **Unzip the Package**: Extract `HMS_Enterprise_v3.0_Retail.zip` to your desired location (e.g., `C:\HMS`).
2.  **Install Dependencies**:
    Open a terminal in the root folder and run:
    ```bash
    cd server
    npm install
    cd ../client
    npm install
    ```

## 3. Database Setup
1.  Create a PostgreSQL database named `hms_db`.
2.  Configure database credentials in `server/.env` (Create this file if it doesn't exist, copying from `.env.example`).
    ```env
    DB_USER=postgres
    DB_HOST=localhost
    DB_NAME=hms_db
    DB_PASSWORD=your_password
    DB_PORT=5432
    JWT_SECRET=your_jwt_secret
    ```
3.  Run Migrations:
    ```bash
    cd server
    node seed.js
    ```
    *(Note: `seed.js` initializes the schema and creates default users).*

## 4. Running the Application
1.  **Start the Server**:
    ```bash
    cd server
    npm start
    ```
    Server runs on `http://localhost:5000`.

    > **Troubleshooting**: If you see `EADDRINUSE: address already in use`, it means port 5000 is occupied.
    > 1. Open `server/.env`.
    > 2. Add/Change `PORT=5001`.
    > 3. Restart the server.

2.  **Start the Client**:
    ```bash
    cd client
    npm run dev
    ```
    Client runs on `http://localhost:5173`.

## 5. Licensing
1.  On first login, you will see a "License Error".
2.  Use the `License_Key_Generator.js` tool to generate a key for your hospital.
    ```bash
    node License_Key_Generator.js
    ```
3.  Enter the key in the `/api/license/activate` endpoint (or via the UI if implemented).
    *For manual activation, paste the key into `server/license.key`.*

## 6. Support
For technical support, contact the IT Department.
