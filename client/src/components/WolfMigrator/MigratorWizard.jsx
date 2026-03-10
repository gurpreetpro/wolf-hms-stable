import React, { useState } from 'react';
import axios from 'axios';
import { 
    Box, Stepper, Step, StepLabel, Button, Typography, 
    Paper, Table, TableBody, TableCell, TableHead, TableRow,
    Select, MenuItem, LinearProgress, Alert, Card, CardContent
} from '@mui/material';
import { CloudUpload as UploadIcon, CheckCircle as CheckIcon, Warning as WarningIcon } from '@mui/icons-material';

const STEPS = ['Upload CSV', 'Map Columns', 'Validate Data', 'Commit Import'];

const TARGET_FIELDS = [
    { value: 'name', label: 'Patient Name (Required)' },
    { value: 'phone', label: 'Phone Number (Required)' },
    { value: 'gender', label: 'Gender' },
    { value: 'dob', label: 'Date of Birth (YYYY-MM-DD)' },
    { value: 'address', label: 'Address' },
    { value: 'email', label: 'Email' }
];

const MigratorWizard = () => {
    const [activeStep, setActiveStep] = useState(0);
    const [file, setFile] = useState(null);
    const [job, setJob] = useState(null);
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [mapping, setMapping] = useState({});
    const [validationResult, setValidationResult] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [committing, setCommitting] = useState(false);

    // --- Step 1: Upload ---
    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post('/api/migration/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setJob(res.data.job);
            // Parse headers locally for preview (simple split)
            const text = await file.text();
            const firstLine = text.split('\n')[0];
            const headers = firstLine.split(',').map(h => h.trim());
            setCsvHeaders(headers);
            
            // Auto-Map
            const newMap = {};
            headers.forEach(h => {
                const lower = h.toLowerCase();
                if (lower.includes('name')) newMap.name = h;
                if (lower.includes('phone') || lower.includes('mobile')) newMap.phone = h;
                if (lower.includes('sex') || lower.includes('gender')) newMap.gender = h;
                if (lower.includes('dob') || lower.includes('birth')) newMap.dob = h;
            });
            setMapping(newMap);

            setActiveStep(1);
        } catch (err) {
            alert('Upload Failed: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    // --- Step 2: Mapping ---
    const handleMapChange = (target, source) => {
        setMapping(prev => ({ ...prev, [target]: source }));
    };

    const handleValidateTrigger = async () => {
        try {
            const res = await axios.post(`/api/migration/validations/${job.id}`, { mappingConfig: mapping });
            setJob(res.data.job);
            
            // Poll for result (Mocking poll for now, assuming fast valid)
            // In real app, use Interval
            setTimeout(async () => {
                // creating a simple poll mechanism here if needed or just use current job if sync
                 setValidationResult(res.data.job); // Assuming API returns updated job immediately for small files in this v1
                 setActiveStep(2);
            }, 1000);

        } catch (err) {
            alert('Validation Trigger Failed');
        }
    };

    // --- Step 3: Validation ---
    // (Rendered in renderStep)

    // --- Step 4: Commit ---
    const handleCommit = async () => {
        setCommitting(true);
        try {
             await axios.post(`/api/migration/commit/${job.id}`);
             setActiveStep(3); // Done
        } catch (err) {
            alert('Commit Failed: ' + err.message);
        } finally {
            setCommitting(false);
        }
    };


    const renderStep = () => {
        switch (activeStep) {
            case 0:
                return (
                    <Box sx={{ p: 4, textAlign: 'center', border: '2px dashed #ccc' }}>
                        <UploadIcon sx={{ fontSize: 60, color: '#ccc' }} />
                        <Typography variant="h6">One-Click Legacy Migration</Typography>
                        <input type="file" accept=".csv" onChange={handleFileChange} style={{ marginTop: 20 }} />
                        <Box sx={{ mt: 2 }}>
                            <Button 
                                variant="contained" 
                                onClick={handleUpload} 
                                disabled={!file || uploading}
                            >
                                {uploading ? 'Streaming...' : 'Upload & Analyze'}
                            </Button>
                        </Box>
                        {uploading && <LinearProgress sx={{ mt: 2 }} />}
                    </Box>
                );
            case 1:
                return (
                    <Box>
                        <Typography variant="h6" gutterBottom>Smart Map Columns</Typography>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            We auto-detected some columns. Please review.
                        </Alert>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Wolf Field</TableCell>
                                    <TableCell>CSV Column</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {TARGET_FIELDS.map(field => (
                                    <TableRow key={field.value}>
                                        <TableCell>{field.label}</TableCell>
                                        <TableCell>
                                            <Select
                                                value={mapping[field.value] || ''}
                                                onChange={(e) => handleMapChange(field.value, e.target.value)}
                                                fullWidth
                                                size="small"
                                                displayEmpty
                                            >
                                                <MenuItem value=""><em>-- Ignore --</em></MenuItem>
                                                {csvHeaders.map(h => (
                                                    <MenuItem key={h} value={h}>{h}</MenuItem>
                                                ))}
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button variant="contained" onClick={handleValidateTrigger}>
                                Run Dry Validation
                            </Button>
                        </Box>
                    </Box>
                );
            case 2:
                // Validation Results
                const isReady = validationResult && validationResult.status === 'VALIDATED';
                return (
                    <Box>
                        <Typography variant="h6">Validation Report</Typography>
                        {isReady ? (
                             <Card sx={{ mt: 2, bgcolor: validationResult.error_rows > 0 ? '#fff4e5' : '#e8f5e9' }}>
                                <CardContent>
                                    <Typography variant="h4" color="primary">
                                        {validationResult.valid_rows} / {validationResult.total_rows} Rows Valid
                                    </Typography>
                                    <Typography color="error" sx={{ mt: 1 }}>
                                        {validationResult.error_rows} Errors Found
                                    </Typography>
                                    {validationResult.error_rows > 0 && (
                                        <Typography variant="caption">
                                            Errors are logged and will be skipped during import.
                                        </Typography>
                                    )}
                                </CardContent>
                             </Card>
                        ) : (
                            <Typography>Validating...</Typography>
                        )}

                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                            <Button onClick={() => setActiveStep(1)}>Back</Button>
                            <Button 
                                variant="contained" 
                                color={validationResult?.error_rows > 0 ? 'warning' : 'success'}
                                onClick={handleCommit}
                                disabled={committing || !isReady}
                            >
                                {committing ? 'Migrating...' : 'Start Vampire Migration'}
                            </Button>
                        </Box>
                    </Box>
                );
            case 3:
                return (
                    <Box sx={{ textAlign: 'center', p: 4 }}>
                        <CheckIcon sx={{ fontSize: 80, color: 'success.main' }} />
                        <Typography variant="h5">Migration Complete!</Typography>
                        <Typography>Legacy data has been restored to Wolf HMS.</Typography>
                        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => window.location.reload()}>
                            Migrate Another File
                        </Button>
                    </Box>
                );
            default:
                return null;
        }
    };

    return (
        <Paper sx={{ p: 4, maxWidth: 800, margin: 'auto', mt: 4 }}>
            <Typography variant="h4" gutterBottom>Wolf Migrator 🧛</Typography>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {STEPS.map(label => (
                    <Step key={label}><StepLabel>{label}</StepLabel></Step>
                ))}
            </Stepper>
            {renderStep()}
        </Paper>
    );
};

export default MigratorWizard;
