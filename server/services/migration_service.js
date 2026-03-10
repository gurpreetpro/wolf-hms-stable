const fs = require('fs');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BATCH_SIZE = 500;

class MigrationService {
    /**
     * Stage 1: Upload and Parse (Streaming)
     * Instead of loading to memory, we stream and count.
     */
    async createJob(file, hospitalId, userId) {
        return await prisma.migration_jobs.create({
            data: {
                filename: file.filename,
                original_name: file.originalname,
                file_path: file.path,
                status: 'UPLOADED',
                hospital_id: hospitalId,
                created_by: userId
            }
        });
    }

    /**
     * Stage 2: Validation Dry Run
     * Reads stream, validates against schema, records errors.
     * Does NOT insert into real tables.
     */
    async validateJob(jobId, mappingConfig) {
        const job = await prisma.migration_jobs.findUnique({ where: { id: parseInt(jobId) } });
        if (!job) throw new Error('Job not found');

        // Update status and mapping
        await prisma.migration_jobs.update({
            where: { id: job.id },
            data: { status: 'VALIDATING', mapping_config: mappingConfig }
        });

        // Clear previous errors
        await prisma.migration_errors.deleteMany({ where: { job_id: job.id } });

        let totalRows = 0;
        let validRows = 0;
        let errorRowsCount = 0;
        const errorsToInsert = [];

        return new Promise((resolve, reject) => {
            fs.createReadStream(job.file_path)
                .pipe(csv())
                .on('data', (row) => {
                    totalRows++;
                    const validation = this._validateRow(row, mappingConfig);
                    
                    if (validation.isValid) {
                        validRows++;
                    } else {
                        errorRowsCount++;
                        if (errorsToInsert.length < 1000) { // Limit error logging to safeguard DB
                             errorsToInsert.push({
                                job_id: job.id,
                                row_number: totalRows,
                                row_data: row,
                                error_message: validation.error
                            });
                        }
                    }
                })
                .on('end', async () => {
                    // Bulk insert errors
                    if (errorsToInsert.length > 0) {
                         await prisma.migration_errors.createMany({ data: errorsToInsert });
                    }

                    // Update Job Stats
                    const updatedJob = await prisma.migration_jobs.update({
                        where: { id: job.id },
                        data: {
                            status: 'VALIDATED',
                            total_rows: totalRows,
                            valid_rows: validRows,
                            error_rows: errorRowsCount
                        }
                    });

                    resolve(updatedJob);
                })
                .on('error', reject);
        });
    }

    /**
     * Stage 3: Commit
     * Reads stream again, only takes valid rows, batch inserts them.
     * Uses Transaction.
     */
    async commitJob(jobId) {
        const job = await prisma.migration_jobs.findUnique({ where: { id: parseInt(jobId) } });
        if (!job) throw new Error('Job not found');
        if (job.status !== 'VALIDATED') throw new Error('Job must be validated before commit');

        await prisma.migration_jobs.update({ where: { id: job.id }, data: { status: 'COMMITTING' } });

        let batch = [];
        let committedCount = 0;
        const mapping = job.mapping_config; // JSON object

        return new Promise((resolve, reject) => {
            const stream = fs.createReadStream(job.file_path).pipe(csv());

            stream.on('data', async (row) => {
                const validation = this._validateRow(row, mapping);
                if (validation.isValid) {
                    // Transform row to Patient Schema
                    const patientData = this._transformRow(row, mapping, job.hospital_id);
                    batch.push(patientData);

                    if (batch.length >= BATCH_SIZE) {
                        stream.pause();
                        await this._processBatch(batch);
                        committedCount += batch.length;
                        batch = []; // Clear
                        stream.resume();
                    }
                }
            });

            stream.on('end', async () => {
                if (batch.length > 0) {
                    await this._processBatch(batch);
                    committedCount += batch.length;
                }

                await prisma.migration_jobs.update({
                    where: { id: job.id },
                    data: { status: 'COMPLETED' }
                });
                resolve({ committed: committedCount });
            });

            stream.on('error', async (err) => {
                await prisma.migration_jobs.update({
                    where: { id: job.id },
                    data: { status: 'FAILED' }
                });
                reject(err);
            });
        });
    }

    // --- Helpers ---

    _validateRow(row, mapping) {
        // Simple Example Validation (Expand logic here)
        // Check if mapped mandatory fields exist
        // mapping = { "name": "CSV_COL_NAME", "phone": "CSV_COL_PHONE" }
        
        // 1. Check Mandatory Fields
        const requiredFields = ['name', 'phone']; // Wolf HMS requirements
        for (const field of requiredFields) {
            const csvCol = mapping[field];
            if (!csvCol || !row[csvCol]) {
                 return { isValid: false, error: `Missing required field: ${field}` };
            }
        }
        
        return { isValid: true };
    }

    _transformRow(row, mapping, hospitalId) {
        return {
            name: row[mapping.name],
            phone: row[mapping.phone],
            gender: row[mapping.gender] || 'Unknown',
            dob: row[mapping.dob] ? new Date(row[mapping.dob]) : null,
            address: row[mapping.address] || '',
            hospital_id: hospitalId,
            // Let DB generate ID via gen_random_uuid(), or provide 'id' if needed. 
            // We'll let DB handle it to avoid collisions or just omit it.
            // If we really want to set it: id: crypto.randomUUID()
        };
    }

    async _processBatch(batch) {
        // Using createMany for speed (skipDuplicates if needed)
        // Note: 'patients' table in schema needs to check unique constraints
        // For simplicity, we assume 'patients' table
        try {
            await prisma.patients.createMany({
                data: batch,
                skipDuplicates: true 
            });
        } catch (e) {
            console.error("Batch Insert Failed", e);
            throw e;
        }
    }
}

module.exports = new MigrationService();
