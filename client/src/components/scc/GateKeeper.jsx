import React from 'react';
import { Card, CardContent, Typography, Grid, Box, Switch, Button, Chip } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const GateKeeper = ({ gates = [], onToggleGate }) => {
    
    const getStatusColor = (status) => {
        switch (status) {
            case 'OPEN': return 'success';
            case 'LOCKED': return 'error';
            case 'MAINTENANCE': return 'warning';
            default: return 'default';
        }
    };

    return (
        <Card sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: 'white', height: '100%', border: '1px solid #333' }}>
            <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="h6" sx={{ flexGrow: 1, color: '#00e5ff' }}>
                        GATE KEEPER (IoT)
                    </Typography>
                    <Chip label={`${gates.length} CONNECTED`} size="small" color="primary" variant="outlined" />
                </Box>

                <Grid container spacing={2}>
                    {gates.map((gate) => (
                        <Grid item xs={12} key={gate.id}>
                            <Box 
                                sx={{ 
                                    p: 2, 
                                    bgcolor: 'rgba(255,255,255,0.05)', 
                                    borderRadius: 1,
                                    borderLeft: `4px solid ${gate.status === 'OPEN' ? '#00e676' : '#f50057'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold">{gate.name}</Typography>
                                    <Typography variant="caption" color="gray">{gate.location}</Typography>
                                </Box>

                                <Box display="flex" alignItems="center" gap={2}>
                                    <Chip 
                                        icon={gate.status === 'OPEN' ? <LockOpenIcon /> : <LockIcon />} 
                                        label={gate.status} 
                                        color={getStatusColor(gate.status)} 
                                        size="small"
                                    />
                                    
                                    <Button 
                                        variant="outlined" 
                                        size="small"
                                        color={gate.status === 'OPEN' ? 'error' : 'success'}
                                        onClick={() => onToggleGate(gate.id, gate.status === 'OPEN' ? 'LOCKED' : 'OPEN')}
                                    >
                                        {gate.status === 'OPEN' ? 'LOCK' : 'OPEN'}
                                    </Button>
                                </Box>
                            </Box>
                        </Grid>
                    ))}

                    {gates.length === 0 && (
                        <Grid item xs={12}>
                            <Box p={3} textAlign="center" color="gray">
                                <WarningAmberIcon fontSize="large" sx={{ mb: 1, opacity: 0.5 }} />
                                <Typography>No IoT Gates Detected</Typography>
                            </Box>
                        </Grid>
                    )}
                </Grid>
            </CardContent>
        </Card>
    );
};

export default GateKeeper;
