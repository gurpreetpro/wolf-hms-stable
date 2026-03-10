#!/bin/bash
sudo -u postgres psql -d hospital_db -c "UPDATE users SET password = '\$2a\$10\$YhCqFwWXZM6eC3/1Iq2VGuNnKw6x7gTqN.K9zZp5A9v.5c/T2g7yK' WHERE email = 'admin@aceheartinstitute.com';"
echo "DB Updated"
