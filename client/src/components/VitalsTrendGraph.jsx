import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, Badge, Row, Col } from 'react-bootstrap';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * VitalsTrendGraph - Displays patient vitals trend over time with Recharts
 * Gold Standard Phase 3 - Real-time visualization of BP, Pulse, SpO2, Temp
 */
const VitalsTrendGraph = ({ vitalsHistory = [], title = "72-Hour Trends" }) => {
    // Transform vitals data for Recharts
    const chartData = vitalsHistory
        .slice(0, 20) // Last 20 readings
        .reverse() // Oldest first for timeline
        .map((v, index) => {
            // Parse BP (e.g., "120/80") into systolic and diastolic
            let systolic = 0, diastolic = 0;
            if (v.bp && v.bp.includes('/')) {
                const parts = v.bp.split('/');
                systolic = parseInt(parts[0]) || 0;
                diastolic = parseInt(parts[1]) || 0;
            }

            return {
                time: new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: new Date(v.created_at).toLocaleDateString(),
                systolic,
                diastolic,
                pulse: parseInt(v.heart_rate) || 0,
                spo2: parseInt(v.spo2) || 0,
                temp: parseFloat(v.temp) || 0,
                index
            };
        });

    // Calculate trends
    const getTrend = (key) => {
        if (chartData.length < 2) return 'stable';
        const latest = chartData[chartData.length - 1][key];
        const previous = chartData[chartData.length - 2][key];
        if (latest > previous * 1.05) return 'up';
        if (latest < previous * 0.95) return 'down';
        return 'stable';
    };

    const TrendIcon = ({ trend }) => {
        if (trend === 'up') return <TrendingUp size={14} className="text-danger" />;
        if (trend === 'down') return <TrendingDown size={14} className="text-success" />;
        return <Minus size={14} className="text-muted" />;
    };

    if (chartData.length === 0) {
        return (
            <Card className="border-0 shadow-sm">
                <Card.Body className="text-center text-muted py-4">
                    No vitals data available for trend analysis
                </Card.Body>
            </Card>
        );
    }

    // Get latest values for summary
    const latest = chartData[chartData.length - 1];

    return (
        <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white fw-bold border-0 d-flex justify-content-between align-items-center">
                <span>📊 {title}</span>
                <small className="text-muted fw-normal">{chartData.length} readings</small>
            </Card.Header>
            <Card.Body>
                {/* Quick Summary Row */}
                <Row className="mb-3 g-2">
                    <Col xs={3}>
                        <div className="bg-danger bg-opacity-10 rounded p-2 text-center">
                            <small className="text-danger d-block">BP</small>
                            <strong>{latest.systolic}/{latest.diastolic}</strong>
                            <TrendIcon trend={getTrend('systolic')} />
                        </div>
                    </Col>
                    <Col xs={3}>
                        <div className="bg-warning bg-opacity-10 rounded p-2 text-center">
                            <small className="text-warning d-block">Pulse</small>
                            <strong>{latest.pulse}</strong>
                            <TrendIcon trend={getTrend('pulse')} />
                        </div>
                    </Col>
                    <Col xs={3}>
                        <div className="bg-primary bg-opacity-10 rounded p-2 text-center">
                            <small className="text-primary d-block">SpO2</small>
                            <strong>{latest.spo2}%</strong>
                            <TrendIcon trend={getTrend('spo2')} />
                        </div>
                    </Col>
                    <Col xs={3}>
                        <div className="bg-success bg-opacity-10 rounded p-2 text-center">
                            <small className="text-success d-block">Temp</small>
                            <strong>{latest.temp}°F</strong>
                            <TrendIcon trend={getTrend('temp')} />
                        </div>
                    </Col>
                </Row>

                {/* Blood Pressure + Pulse Chart */}
                <div className="mb-4">
                    <h6 className="text-muted small mb-2">Blood Pressure & Pulse</h6>
                    <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                            <YAxis domain={[40, 180]} tick={{ fontSize: 10 }} />
                            <Tooltip 
                                contentStyle={{ fontSize: '11px' }}
                                labelFormatter={(value, payload) => 
                                    payload[0] ? `${payload[0].payload.date} ${value}` : value
                                }
                            />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <ReferenceLine y={90} stroke="#ffc107" strokeDasharray="5 5" label="" />
                            <ReferenceLine y={140} stroke="#dc3545" strokeDasharray="5 5" label="" />
                            <Line type="monotone" dataKey="systolic" stroke="#dc3545" strokeWidth={2} name="Systolic" dot={{ r: 2 }} />
                            <Line type="monotone" dataKey="diastolic" stroke="#6c757d" strokeWidth={2} name="Diastolic" dot={{ r: 2 }} />
                            <Line type="monotone" dataKey="pulse" stroke="#fd7e14" strokeWidth={2} name="Pulse" dot={{ r: 2 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* SpO2 + Temperature Chart */}
                <div>
                    <h6 className="text-muted small mb-2">SpO2 & Temperature</h6>
                    <ResponsiveContainer width="100%" height={130}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                            <YAxis yAxisId="left" domain={[85, 100]} tick={{ fontSize: 10 }} />
                            <YAxis yAxisId="right" orientation="right" domain={[95, 105]} tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ fontSize: '11px' }} />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <ReferenceLine yAxisId="left" y={95} stroke="#dc3545" strokeDasharray="5 5" />
                            <Line yAxisId="left" type="monotone" dataKey="spo2" stroke="#0d6efd" strokeWidth={2} name="SpO2 %" dot={{ r: 2 }} />
                            <Line yAxisId="right" type="monotone" dataKey="temp" stroke="#198754" strokeWidth={2} name="Temp °F" dot={{ r: 2 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card.Body>
        </Card>
    );
};

export default VitalsTrendGraph;
