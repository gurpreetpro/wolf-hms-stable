import React, { useState } from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText, ListItemAvatar, Avatar, Chip, Button, Dialog, DialogTitle, DialogContent, TextField, Select, MenuItem, InputLabel, FormControl, Box } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';

const MissionControl = ({ missions = [], activeGuards = [], onDispatch }) => {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        type: 'PATROL',
        priority: 'ROUTINE',
        location_name: '',
        assigned_to_id: '',
        description: ''
    });

    const handleDispatch = () => {
        onDispatch(formData);
        setOpen(false);
        setFormData({ title: '', type: 'PATROL', priority: 'ROUTINE', location_name: '', assigned_to_id: '', description: '' });
    };

    return (
        <Card sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: 'white', height: '100%', border: '1px solid #333' }}>
            <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="h6" sx={{ flexGrow: 1, color: '#ff9100' }}>
                        MISSION CONTROL
                    </Typography>
                    <Button 
                        startIcon={<AddIcon />} 
                        variant="contained" 
                        color="warning" 
                        size="small"
                        onClick={() => setOpen(true)}
                    >
                        DISPATCH
                    </Button>
                </Box>

                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {missions.map((mission) => (
                        <ListItem key={mission.id} sx={{ mb: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                            <ListItemAvatar>
                                <Avatar sx={{ bgcolor: mission.priority === 'CRITICAL' ? 'red' : 'green' }}>
                                    <AssignmentIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText 
                                primary={
                                    <Typography variant="subtitle2" color="white">
                                        {mission.title}
                                    </Typography>
                                }
                                secondary={
                                    <Typography variant="caption" color="gray">
                                        {mission.location_name} • {mission.assigned_guard_name || 'Unassigned'}
                                    </Typography>
                                }
                            />
                            <Chip 
                                label={mission.status} 
                                size="small" 
                                color={mission.status === 'RESOLVED' ? 'success' : 'default'} 
                                variant="outlined"
                            />
                        </ListItem>
                    ))}
                    {missions.length === 0 && (
                        <Typography variant="body2" color="gray" textAlign="center" py={4}>
                            No active missions. Sector quiet.
                        </Typography>
                    )}
                </List>

                {/* Dispatch Dialog */}
                <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Dispatch New Mission</DialogTitle>
                    <DialogContent>
                        <Box display="flex" flexDirection="column" gap={2} mt={1}>
                            <TextField 
                                label="Mission Title" 
                                fullWidth 
                                value={formData.title} 
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                            />
                            
                            <Box display="flex" gap={2}>
                                <FormControl fullWidth>
                                    <InputLabel>Type</InputLabel>
                                    <Select 
                                        value={formData.type} 
                                        label="Type"
                                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    >
                                        <MenuItem value="PATROL">Patrol</MenuItem>
                                        <MenuItem value="INVESTIGATE">Investigate</MenuItem>
                                        <MenuItem value="ESCORT">Escort</MenuItem>
                                        <MenuItem value="CODE_RESPONSE">Code Response</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl fullWidth>
                                    <InputLabel>Priority</InputLabel>
                                    <Select 
                                        value={formData.priority} 
                                        label="Priority"
                                        onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                    >
                                        <MenuItem value="ROUTINE">Routine</MenuItem>
                                        <MenuItem value="HIGH">High</MenuItem>
                                        <MenuItem value="CRITICAL">Critical</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>

                            <TextField 
                                label="Location" 
                                fullWidth 
                                value={formData.location_name} 
                                onChange={(e) => setFormData({...formData, location_name: e.target.value})}
                            />

                            <FormControl fullWidth>
                                <InputLabel>Assign To (Optional)</InputLabel>
                                <Select 
                                    value={formData.assigned_to_id} 
                                    label="Assign To (Optional)"
                                    onChange={(e) => setFormData({...formData, assigned_to_id: e.target.value})}
                                >
                                    <MenuItem value=""><em>Auto-Assign</em></MenuItem>
                                    {activeGuards.map(g => (
                                        <MenuItem key={g.guard_id} value={g.guard_id}>{g.guard_name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField 
                                label="Description" 
                                fullWidth 
                                multiline 
                                rows={3}
                                value={formData.description} 
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                            
                            <Button 
                                variant="contained" 
                                color="primary" 
                                endIcon={<SendIcon />}
                                onClick={handleDispatch}
                                sx={{ mt: 1 }}
                            >
                                TRANSMIT ORDERS
                            </Button>
                        </Box>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
};

export default MissionControl;
