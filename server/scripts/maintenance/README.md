# Maintenance Scripts

This directory contains ad-hoc scripts used for debugging, patching data, and manual operations. 

**Warning**: These scripts are not part of the core automated migration pipeline and should be used with caution.

## Categories
*   `fix_*.js`: Patches for specific bugs or data inconsistencies.
*   `add_*.js`: Scripts to manually add missing columns or data.
*   `check_*.js` / `audit_*.js`: Diagnostic tools.
*   `create_*.js`: Seeders or creators for specific entities.

## Usage
Run these from the `server/` root (adjusting path if necessary) or directly here if they support it.
e.g. `node scripts/maintenance/fix_passwords.js`
