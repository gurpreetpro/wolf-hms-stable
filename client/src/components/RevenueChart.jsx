import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from 'react-bootstrap';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const RevenueChart = ({ data }) => {
    // If no data, show a placeholder
    if (!data || data.length === 0) {
        return (
            <Card className="border-0 shadow-sm h-100">
                <Card.Body className="d-flex align-items-center justify-content-center text-muted" style={{ minHeight: '300px' }}>
                    No revenue data available for trends.
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-sm h-100">
            <Card.Body>
                <div className="d-flex align-items-center mb-3">
                    <TrendingUp className="text-success me-2" size={20} />
                    <h6 className="fw-bold mb-0">Revenue Trend (7 Days)</h6>
                </div>
                <div style={{ height: '250px', width: '100%' }}>
                    <ResponsiveContainer>
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="date"
                                tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                style={{ fontSize: '12px' }}
                            />
                            <YAxis hide />
                            <Tooltip
                                formatter={(value) => [formatCurrency(value), 'Revenue']}
                                labelFormatter={(label) => new Date(label).toDateString()}
                            />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#10b981"
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card.Body>
        </Card>
    );
};

export default RevenueChart;
