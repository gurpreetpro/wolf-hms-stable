# 🔑 Master Credential Sheet
**Confidential - For Authorized Personnel Only**

## Default System Accounts
These accounts are created by the `seed.js` script. Please change passwords immediately after deployment.

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin_user` | `password123` | Full System Access, Finance, User Management |
| **Doctor** | `doctor_user` | `password123` | OPD, IPD, Admissions, Tasks, Labs |
| **Nurse** | `nurse_user` | `password123` | Vitals, Bed Management, Emergency Trigger |
| **Pharmacist** | `pharmacist_user` | `password123` | Inventory, Dispensing |
| **Receptionist** | `receptionist_user` | `password123` | Patient Registration, Queue Management |

## Database Credentials
*Configured in `server/.env`*
- **User**: `postgres` (Default)
- **Password**: *(As set during installation)*

## License Key Secret
- **Secret Key**: `ANTIGRAVITY-HMS-SUPER-SECRET-KEY-2025`
*(Used by the License Generator to sign keys. Do not share.)*
