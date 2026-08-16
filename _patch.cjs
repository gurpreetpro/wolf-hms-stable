const fs = require('fs');
const path = 'server/prisma/schema.prisma';
let c = fs.readFileSync(path, 'utf8');
c = c.replace(/\r/g, '');
const lines = c.split('\n');
console.log('Total lines:', lines.length);
if (lines[4277] && lines[4277].includes('chemo_administrations')) {
  console.log('FOUND target at 4277');
  const newLines = [
    '  chemo_administrations                                                           chemo_sessions[]',
    '  dialysis_performed                                                                      dialysis_sessions[]',
    '  dental_visits_performed                                                                      dental_visits[]',
    '  dental_procedures_performed                                                                      dental_procedures[]',
    '  dental_inventory_managed                                                                          dental_inventory[]',
    '  dental_lab_orders_managed                                                                         dental_lab_orders[]',
    '  ophthalmology_visits_performed                                                                       ophthalmology_visits[]',
    '  ophthalmology_procedures_performed                                                                       ophthalmology_procedures[]',
    '  ophthalmology_biometry_performed                                                                        ophthalmology_biometry[]',
    '  ophthalmology_inventory_managed                                                                        ophthalmology_inventory[]',
    '  orthopedic_visits_performed                                                                         orthopedic_visits[]',
    '  orthopedic_procedures_performed                                                                       orthopedic_procedures[]',
    '  orthopedic_implants_managed                                                                         orthopedic_implants[]',
    '  orthopedic_physio_orders_ordered                                                                     orthopedic_physio_orders[]',
    '',
    '  @@index([email], map: \"idx_users_email\")',
    '  @@index([hospital_id], map: \"idx_users_hospital_id\")',
    '  @@index([is_active], map: \"idx_users_is_active\")',
    '  @@index([is_visiting], map: \"idx_users_is_visiting\")',
    '  @@index([mfa_enabled], map: \"idx_users_mfa_enabled\")',
    '  @@index([role], map: \"idx_users_role\")',
    '  @@index([specialist_category_id], map: \"idx_users_specialist_category\")',
    '  @@index([username], map: \"idx_users_username\")',
    '  @@index([hospital_id, role], map: \"idx_users_hospital_role\")',
    '}',
    '',
    'model vehicle_inspections {'
  ];
  lines.splice(4277, 14, ...newLines);
  fs.writeFileSync(path, lines.join('\n'));
  console.log('SUCCESS: Users model patched');
} else {
  console.log('FAIL: Target not found at 4277');
  console.log('Found:', JSON.stringify(lines[4277]));
}