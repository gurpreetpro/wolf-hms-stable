import React, { useState, useMemo } from 'react';
import { Card, Button, ButtonGroup, Row, Col, Badge } from 'react-bootstrap';
import { Activity, Thermometer, Heart, Droplets, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Simple SVG Line Chart Component (no external library needed)
const LineChart = ({ data, color, label, unit, minY, maxY, thresholdLow, thresholdHigh }) => {
    if (!data || data.length === 0) {
        return (
            <div className="text-center text-muted py-4">
                <Activity size={24} className="opacity-50 mb-2" />
                <p className="small mb-0">No {label} data available</p>
            </div>
        );
    }

    const width = 300;
    const height = 100;
    const padding = 20;

    // Calculate min/max for scaling
    const values = data.map(d => d.value).filter(v => !isNaN(v));
    const actualMin = Math.min(...values, minY || 0);
    const actualMax = Math.max(...values, maxY || 100);
    const range = actualMax - actualMin || 1;

    // Generate path
    const points = data.map((d, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
        const y = height - padding - ((d.value - actualMin) / range) * (height - padding * 2);
        return `${x},${y}`;
    }).join(' ');

    // Get latest value and trend
    const latestValue = values[values.length - 1];
    const prevValue = values.length > 1 ? values[values.length - 2] : latestValue;
    const trend = latestValue > prevValue ? 'up' : latestValue < prevValue ? 'down' : 'stable';
    const isAbnormal = (thresholdHigh && latestValue > thresholdHigh) ||
        (thresholdLow && latestValue < thresholdLow);

    return (
        <Card className={`h-100 ${isAbnormal ? 'border-danger' : ''}`}>
            <Card.Header className="d-flex justify-content-between align-items-center py-2 bg-white">
                <span className="fw-bold" style={{ color }}>{label}</span>
                <div className="d-flex align-items-center gap-2">
                    <span className={`fw-bold ${isAbnormal ? 'text-danger' : ''}`}>
                        {latestValue?.toFixed(1) || '--'} {unit}
                    </span>
                    {trend === 'up' && <TrendingUp size={16} className="text-danger" />}
                    {trend === 'down' && <TrendingDown size={16} className="text-success" />}
                    {trend === 'stable' && <Minus size={16} className="text-muted" />}
                </div>
            </Card.Header>
            <Card.Body className="p-2">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-100" style={{ height: '80px' }}>
                    {/* Threshold lines */}
                    {thresholdHigh && (
                        <line
                            x1={padding}
                            y1={height - padding - ((thresholdHigh - actualMin) / range) * (height - padding * 2)}
                            x2={width - padding}
                            y2={height - padding - ((thresholdHigh - actualMin) / range) * (height - padding * 2)}
                            stroke="#dc3545"
                            strokeDasharray="4"
                            strokeWidth="1"
                            opacity="0.5"
                        />
                    )}
                    {thresholdLow && (
                        <line
                            x1={padding}
                            y1={height - padding - ((thresholdLow - actualMin) / range) * (height - padding * 2)}
                            x2={width - padding}
                            y2={height - padding - ((thresholdLow - actualMin) / range) * (height - padding * 2)}
                            stroke="#ffc107"
                            strokeDasharray="4"
                            strokeWidth="1"
                            opacity="0.5"
                        />
                    )}
                    {/* Data line */}
                    <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        points={points}
                    />
                    {/* Data points */}
                    {data.map((d, i) => {
                        const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
                        const y = height - padding - ((d.value - actualMin) / range) * (height - padding * 2);
                        const pointIsAbnormal = (thresholdHigh && d.value > thresholdHigh) ||
                            (thresholdLow && d.value < thresholdLow);
                        return (
                            <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r="4"
                                fill={pointIsAbnormal ? '#dc3545' : color}
                            />
                        );
                    })}
                </svg>
                {/* Time labels */}
                <div className="d-flex justify-content-between px-2 text-muted small">
                    <span>{data[0]?.time || ''}</span>
                    <span>{data[data.length - 1]?.time || ''}</span>
                </div>
            </Card.Body>
        </Card>
    );
};

const VitalsChart = ({ vitalsHistory = [], timeRange = '24h' }) => {
    const [selectedRange, setSelectedRange] = useState(timeRange);

    // Process vitals data based on time range
    const processedData = useMemo(() => {
        if (!vitalsHistory || vitalsHistory.length === 0) {
            return { bp_systolic: [], bp_diastolic: [], temp: [], spo2: [], heart_rate: [] };
        }

        // Filter by time range
        const now = new Date();
        const rangeHours = selectedRange === '24h' ? 24 : selectedRange === '7d' ? 168 : 720;
        const cutoff = new Date(now.getTime() - rangeHours * 60 * 60 * 1000);

        const filtered = vitalsHistory.filter(v => new Date(v.recorded_at) >= cutoff);

        // Transform to chart data
        const formatTime = (date) => {
            const d = new Date(date);
            return selectedRange === '24h'
                ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        };

        return {
            bp_systolic: filtered.map(v => {
                const bp = v.bp?.split('/') || [];
                return { value: parseFloat(bp[0]) || 0, time: formatTime(v.recorded_at) };
            }).filter(d => d.value > 0),
            bp_diastolic: filtered.map(v => {
                const bp = v.bp?.split('/') || [];
                return { value: parseFloat(bp[1]) || 0, time: formatTime(v.recorded_at) };
            }).filter(d => d.value > 0),
            temp: filtered.map(v => ({
                value: parseFloat(v.temp) || 0,
                time: formatTime(v.recorded_at)
            })).filter(d => d.value > 0),
            spo2: filtered.map(v => ({
                value: parseFloat(v.spo2) || 0,
                time: formatTime(v.recorded_at)
            })).filter(d => d.value > 0),
            heart_rate: filtered.map(v => ({
                value: parseFloat(v.heart_rate) || 0,
                time: formatTime(v.recorded_at)
            })).filter(d => d.value > 0)
        };
    }, [vitalsHistory, selectedRange]);

    // Calculate stats
    const stats = useMemo(() => {
        const calcStats = (data) => {
            if (!data || data.length === 0) return { min: '--', max: '--', avg: '--' };
            const values = data.map(d => d.value);
            return {
                min: Math.min(...values).toFixed(1),
                max: Math.max(...values).toFixed(1),
                avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
            };
        };
        return {
            temp: calcStats(processedData.temp),
            spo2: calcStats(processedData.spo2),
            hr: calcStats(processedData.heart_rate)
        };
    }, [processedData]);

    return (
        <div className="vitals-chart">
            {/* Time Range Selector */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">
                    <Activity size={18} className="me-2 text-primary" />
                    Vitals Trend
                </h6>
                <ButtonGroup size="sm">
                    <Button
                        variant={selectedRange === '24h' ? 'primary' : 'outline-primary'}
                        onClick={() => setSelectedRange('24h')}
                    >
                        24h
                    </Button>
                    <Button
                        variant={selectedRange === '7d' ? 'primary' : 'outline-primary'}
                        onClick={() => setSelectedRange('7d')}
                    >
                        7 Days
                    </Button>
                    <Button
                        variant={selectedRange === '30d' ? 'primary' : 'outline-primary'}
                        onClick={() => setSelectedRange('30d')}
                    >
                        30 Days
                    </Button>
                </ButtonGroup>
            </div>

            {/* Charts Grid */}
            <Row className="g-3">
                <Col md={6}>
                    <LineChart
                        data={processedData.bp_systolic}
                        color="#dc3545"
                        label="Blood Pressure (Systolic)"
                        unit="mmHg"
                        thresholdHigh={140}
                        thresholdLow={90}
                    />
                </Col>
                <Col md={6}>
                    <LineChart
                        data={processedData.heart_rate}
                        color="#e83e8c"
                        label="Heart Rate"
                        unit="bpm"
                        thresholdHigh={100}
                        thresholdLow={60}
                    />
                </Col>
                <Col md={6}>
                    <LineChart
                        data={processedData.temp}
                        color="#fd7e14"
                        label="Temperature"
                        unit="°F"
                        thresholdHigh={100.4}
                        thresholdLow={96}
                    />
                </Col>
                <Col md={6}>
                    <LineChart
                        data={processedData.spo2}
                        color="#20c997"
                        label="SpO2"
                        unit="%"
                        thresholdLow={94}
                    />
                </Col>
            </Row>

            {/* Stats Summary */}
            <Card className="mt-3 bg-light">
                <Card.Body className="py-2">
                    <Row className="text-center small">
                        <Col>
                            <div className="text-muted">Temp</div>
                            <div className="fw-bold">
                                <Thermometer size={14} className="me-1 text-warning" />
                                {stats.temp.avg}°F avg
                            </div>
                        </Col>
                        <Col>
                            <div className="text-muted">SpO2</div>
                            <div className="fw-bold">
                                <Droplets size={14} className="me-1 text-info" />
                                {stats.spo2.avg}% avg
                            </div>
                        </Col>
                        <Col>
                            <div className="text-muted">Heart Rate</div>
                            <div className="fw-bold">
                                <Heart size={14} className="me-1 text-danger" />
                                {stats.hr.avg} bpm avg
                            </div>
                        </Col>
                        <Col>
                            <div className="text-muted">Readings</div>
                            <div className="fw-bold">
                                <Badge bg="primary">{vitalsHistory.length}</Badge>
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        </div>
    );
};

export default VitalsChart;
