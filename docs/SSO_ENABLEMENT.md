# Enterprise Single Sign-On (SSO / OIDC) Enablement Runbook

> **Audience**: Wolf HMS Platform Engineers & System Administrators  
> **Applicability**: Wolf HMS Enterprise Deployments (Phase 5 Hardening)  
> **Compliance Standard**: HIPAA § 164.312(a)(2)(i) (Unique User Identification) & DPDP Act 2023

---

## 1. Overview & Architecture

Wolf HMS supports enterprise Single Sign-On via standard OpenID Connect (OIDC) with PKCE (Proof Key for Code Exchange, RFC 7636).

### Key Architectural Principles
- **Opt-In & Zero Impact**: If OIDC environment variables are unset, SSO is completely disabled and endpoints return `404 Not Found`. Existing password, OTP, and 30-day mobile token authentication continue operating without change.
- **Strict No-Auto-Provisioning**: Enterprise users authenticating via SSO MUST already exist in the Wolf HMS `users` table with a matching email address. Unmapped accounts receive `403 Forbidden` (`User not provisioned. Contact administrator.`).
- **Standard Token Issuance**: Successful SSO login issues a standard 8-hour web JWT session along with a rotating refresh token stored in the `refresh_tokens` table.

---

## 2. Environment Variables

Configure the following environment variables in `server/.env` or the deployment container environment:

| Variable | Description | Example |
|---|---|---|
| `OIDC_ISSUER_URL` | Base discovery URL of the OIDC provider (`/.well-known/openid-configuration`) | `https://login.microsoftonline.com/<tenant-id>/v2.0` |
| `OIDC_CLIENT_ID` | Application / Client ID registered with the IdP | `wolf-hms-prod-app-id` |
| `OIDC_CLIENT_SECRET` | Client Secret issued by the IdP | `[SECURE_CLIENT_SECRET]` |
| `OIDC_REDIRECT_URI` | Whitelisted callback URL on Wolf HMS | `https://hms.yourdomain.com/api/auth/sso/callback` |
| `JWT_SECRET` | Existing Wolf HMS JWT signing key (used for issued app tokens) | `[EXISTING_JWT_SECRET]` |
| `JWT_EXPIRES` | Session expiry (default: 8h) | `8h` |

---

## 3. Provider Configuration Guides

### 3.1 Microsoft Entra ID (Azure Active Directory)

1. **Register Application**:
   - Go to Azure Portal $\rightarrow$ **Microsoft Entra ID** $\rightarrow$ **App registrations** $\rightarrow$ **New registration**.
   - Name: `Wolf HMS Enterprise SSO`.
   - Supported account types: *Accounts in this organizational directory only* (Single tenant).
   - Redirect URI: Web $\rightarrow$ `https://hms.yourdomain.com/api/auth/sso/callback`.
2. **Certificates & Secrets**:
   - Navigate to **Certificates & secrets** $\rightarrow$ **New client secret**.
   - Copy the secret value to `OIDC_CLIENT_SECRET`.
3. **API Permissions**:
   - Ensure `openid`, `profile`, and `email` permissions are granted under Microsoft Graph (delegated).
4. **Environment Variables**:
   ```bash
   OIDC_ISSUER_URL=https://login.microsoftonline.com/<TENANT_ID>/v2.0
   OIDC_CLIENT_ID=<APPLICATION_CLIENT_ID>
   OIDC_CLIENT_SECRET=<CLIENT_SECRET_VALUE>
   OIDC_REDIRECT_URI=https://hms.yourdomain.com/api/auth/sso/callback
   ```

---

### 3.2 Google Workspace (Google Cloud Identity)

1. **OAuth 2.0 Client ID**:
   - Go to Google Cloud Console $\rightarrow$ **APIs & Services** $\rightarrow$ **Credentials**.
   - Click **Create Credentials** $\rightarrow$ **OAuth client ID**.
   - Application type: **Web application**.
   - Authorized redirect URIs: `https://hms.yourdomain.com/api/auth/sso/callback`.
2. **Scopes**:
   - Add `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
3. **Environment Variables**:
   ```bash
   OIDC_ISSUER_URL=https://accounts.google.com
   OIDC_CLIENT_ID=<GOOGLE_CLIENT_ID>.apps.googleusercontent.com
   OIDC_CLIENT_SECRET=<GOOGLE_CLIENT_SECRET>
   OIDC_REDIRECT_URI=https://hms.yourdomain.com/api/auth/sso/callback
   ```

---

### 3.3 Self-Hosted Keycloak

1. **Create Client**:
   - Realm $\rightarrow$ **Clients** $\rightarrow$ **Create client**.
   - Client ID: `wolf-hms`.
   - Client Protocol: `openid-connect`.
2. **Client Settings**:
   - Access Type: `confidential`.
   - Standard Flow Enabled: `ON`.
   - Valid Redirect URIs: `https://hms.yourdomain.com/api/auth/sso/callback`.
   - Proof Key for Code Exchange (PKCE) Code Challenge Method: `S256`.
3. **Credentials**:
   - Navigate to **Credentials** tab and copy the `Secret`.
4. **Environment Variables**:
   ```bash
   OIDC_ISSUER_URL=https://keycloak.yourdomain.com/realms/<REALM_NAME>
   OIDC_CLIENT_ID=wolf-hms
   OIDC_CLIENT_SECRET=<KEYCLOAK_CLIENT_SECRET>
   OIDC_REDIRECT_URI=https://hms.yourdomain.com/api/auth/sso/callback
   ```

---

## 4. User Provisioning Workflow

To maintain strict access boundaries and prevent unauthorized hospital access:

1. **Create User Record**:
   An administrator must create or invite the staff member via the Wolf HMS Admin Console before they can log in via SSO:
   ```sql
   INSERT INTO users (username, full_name, email, role, hospital_id, is_active)
   VALUES ('dr.sharma', 'Dr. Rajesh Sharma', 'rajesh.sharma@hospital.org', 'doctor', 1, true);
   ```
2. **First-Time SSO Login**:
   - User navigates to `/api/auth/sso/login`.
   - User signs in with corporate credentials at their IdP.
   - IdP returns identity token containing `email: "rajesh.sharma@hospital.org"`.
   - Wolf HMS matches email, creates a session, and issues the application JWT.

---

## 5. Troubleshooting & Diagnostics

| Symptom | Cause | Resolution |
|---|---|---|
| `404 Not Found` on `/api/auth/sso/login` | OIDC environment variables not populated | Verify `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, and `OIDC_REDIRECT_URI` are present in environment. |
| `400 State mismatch or session expired` | Callback timed out (>10 mins) or cookies blocked | Ensure cookies are enabled and user completes IdP login within 10 minutes. |
| `403 User not provisioned. Contact administrator.` | User email not found in `users` table | Verify user email spelling in corporate directory vs. Wolf HMS `users.email`. |
| `403 Account is inactive or pending approval.` | User found but `is_active = false` | Admin must activate the user in the Wolf HMS Admin Console. |
