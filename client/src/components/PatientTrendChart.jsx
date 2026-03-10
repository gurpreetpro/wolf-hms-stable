import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from 'react-bootstrap';
import { Users } from 'lucide-react';

const PatientTrendChart = ({ data }) => {
    // If no data, show a placeholder
    if (!data || data.length === 0) {
        return (
            <Card className="border-0 shadow-sm h-100">
                <Card.Body className="d-flex align-items-center justify-content-center text-muted" style={{ minHeight: '300px' }}>
                    No patient data available for trends.
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-sm h-100">
            <Card.Body>
                <div className="d-flex align-items-center mb-3">
                    <Users className="text-primary me-2" size={20} />
                    <h6 className="fw-bold mb-0">Patient Footfall (7 Days)</h6>
                </div>
                <div style={{ height: '250px', width: '100%' }}>
                    <ResponsiveContainer>
                        <BarChart data={data}>
                            <XAxis
                                dataKey="date"
                                tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                style={{ fontSize: '12px' }}
                            />
                            <YAxis hide />
                            <Tooltip
                                cursor={{ fill: '#f3f4f6' }}
                            />
                            <Bar
                                dataKey="count"
                                fill="#3b82f6"
                                radius={[4, 4, 0, 0]}
                                barSize={30}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card.Body>
        </Card>
    );
};

export default PatientTrendChart;
