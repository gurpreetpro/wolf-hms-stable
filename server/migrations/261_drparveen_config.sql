-- Configure Dr. Parveen Hospital - Settings Only
-- This migration adds service charge settings for Dr. Parveen Hospital (ID = 3)
-- 1. Update hospital info
UPDATE hospitals
SET name = 'Dr. Parveen Gupta Multispeciality Hospital',
    address = 'G.T. Road, Opp. Pehalwan Dhaba, Jagraon - 142026',
    city = 'Jagraon',
    state = 'Punjab',
    country = 'India',
    phone = '9877603199'
WHERE code = 'drparveen';
-- 2. Add hospital settings (service charges)
-- First clear existing settings
DELETE FROM hospital_settings
WHERE hospital_id = 3;
-- Add all service charges and room rates
INSERT INTO hospital_settings (key, value, hospital_id)
VALUES -- 24-hour charges
    ('24hr_normal_charge', '2000', 3),
    ('24hr_icu_charge', '6500', 3),
    ('24hr_ventilator_charge', '7500', 3),
    ('oxygen_charge', '2300', 3),
    -- Room rents
    ('general_ward_rent', '2000', 3),
    ('semi_deluxe_rent', '3000', 3),
    ('deluxe_rent', '4000', 3),
    ('super_deluxe_rent', '5000', 3),
    -- General Ward doctor visits
    ('general_ward_doctor_visit_super', '800', 3),
    ('general_ward_doctor_visit_specialist', '700', 3),
    -- Semi Deluxe doctor visits  
    ('semi_deluxe_doctor_visit_super', '800', 3),
    ('semi_deluxe_doctor_visit_specialist', '700', 3),
    -- Deluxe doctor visits
    ('deluxe_doctor_visit_super', '900', 3),
    ('deluxe_doctor_visit_specialist', '800', 3),
    -- Super Deluxe doctor visits
    ('super_deluxe_doctor_visit_super', '1100', 3),
    (
        'super_deluxe_doctor_visit_specialist',
        '1000',
        3
    ),
    -- Hospital branding
    (
        'hospital_name',
        'Dr. Parveen Gupta Multispeciality Hospital',
        3
    ),
    (
        'hospital_tagline',
        'Gupta Hospital - Quality Healthcare Since 1990',
        3
    ),
    (
        'hospital_address',
        'G.T. Road, Opp. Pehalwan Dhaba, Jagraon - 142026 (PB)',
        3
    ),
    ('hospital_phone', '98776-03199', 3),
    (
        'hospital_timings',
        '9:30 AM - 10:30 PM (Mon-Sat)',
        3
    ),
    ('emergency_available', 'true', 3);