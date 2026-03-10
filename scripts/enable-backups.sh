#!/bin/bash

# Configuration
PROJECT_ID="wolf-tech-hms"
INSTANCE_NAME="wolf-hms-db"
REGION="asia-south1"
BUCKET_NAME="wolf-hms-cold-storage"

echo "Starting Iron Dome Backup Configuration..."

# 1. Enable Automated Backups and Point-in-Time Recovery
echo "Enabling automated backups for Cloud SQL instance: $INSTANCE_NAME..."
gcloud sql instances patch $INSTANCE_NAME \
    --project=$PROJECT_ID \
    --backup-start-time 20:30 \
    --enable-point-in-time-recovery

if [ $? -eq 0 ]; then
    echo "✅ Automated backups and PITR enabled successfully."
else
    echo "❌ Failed to enable backups."
    exit 1
fi

# 2. Create Cold Storage Bucket
echo "Creating Cold Storage bucket: gs://$BUCKET_NAME..."
gcloud storage buckets create gs://$BUCKET_NAME \
    --project=$PROJECT_ID \
    --location=$REGION \
    --uniform-bucket-level-access

if [ $? -eq 0 ]; then
    echo "✅ Cold storage bucket created successfully."
else
    echo "⚠️ Bucket creation failed (it might already exist)."
fi

echo "Iron Dome Configuration Complete."
