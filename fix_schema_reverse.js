const fs = require('fs');
const path = 'server/prisma/schema.prisma';
let c = fs.readFileSync(path, 'utf8');

const target = '  dialysis_sessions             dialysis_sessions[]\n\n  @@index([code], map: "idx_hospitals_code")\n  @@index([custom_domain], map: "idx_hospitals_custom_domain")\n  @@index([is_active], map: "idx_hospitals_is_active")\n  @@index([subdomain], map: "idx_hospitals_subdomain")\n}\n\nmodel housekeeping_tasks {';

const repl = '  dialysis_sessions             dialysis_sessions[]\n  dental_visits                 dental_visits[]\n  dental_procedures             dental_procedures[]\n  dental_inventory              dental_inventory[]\n  dental_lab_orders             dental_lab_orders[]\n  ophthalmology_visits          ophthalmology_visits[]\n  ophthalmology_procedures      ophthalmology_procedures[]\n  ophthalmology_biometry        ophthalmology_biometry[]\n  ophthalmology_inventory       ophthalmology_inventory[]\n  orthopedic_visits             orthopedic_visits[]\n  orthopedic_procedures         orthopedic_procedures[]\n  orthopedic_implants           orthopedic_implants[]\n  orthopedic_physio_orders      orthopedic_physio_orders[]\n\n  @@index([code], map: "idx_hospitals_code")\n  @@index([custom_domain], map: "idx_hospitals_custom_domain")\n  @@index([is_active], map: "idx_hospitals_is_active")\n  @@index([subdomain], map: "idx_hospitals_subdomain")\n}\n\nmodel housekeeping_tasks {';

if (c.includes(target)) {
  c = c.replace(target, repl);
  fs.writeFileSync(path, c);
  console.log('SUCCESS: hospitals model updated');
} else {
  // Debug: find the exact location
  const lines = c.split('\n');
  for (let i = 1528; i <= 1542; i++) {
    console.log(i + ' |' + lines[i] + '|');
  }
  console.log('FAIL: target not found');
}