import React from 'react';

/**
 * Simple Bar Chart Component
 * Pure CSS-based, no external dependencies
 */
export const SimpleBarChart = ({
    data = [],
    height = 200,
    barColor = '#0d6efd',
    showLabels = true,
    showValues = true,
    className = ''
}) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
        <div className={className} style={{ height: `${height}px` }}>
            <div className="d-flex align-items-end justify-content-around h-100 gap-2">
                {data.map((item, index) => {
                    const barHeight = (item.value / maxValue) * 100;
                    return (
                        <div
                            key={index}
                            className="d-flex flex-column align-items-center flex-grow-1"
                            style={{ maxWidth: '60px' }}
                        >
                            {showValues && (
                                <small className="text-muted mb-1 fw-bold">
                                    {item.value}
                                </small>
                            )}
                            <div
                                className="rounded-top w-100"
                                style={{
                                    height: `${barHeight}%`,
                                    minHeight: '4px',
                                    backgroundColor: item.color || barColor,
                                    transition: 'height 0.3s ease'
                                }}
                            />
                            {showLabels && (
                                <small className="text-muted mt-1 text-center" style={{ fontSize: '0.7rem' }}>
                                    {item.label}
                                </small>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/**
 * Donut/Pie Chart Component
 * SVG-based, no external dependencies
 */
export const DonutChart = ({
    data = [],
    size = 150,
    strokeWidth = 20,
    showLegend = true,
    centerText = '',
    className = ''
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const total = data.reduce((sum, d) => sum + d.value, 0);

    let currentOffset = 0;

    const defaultColors = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1', '#0dcaf0'];

    return (
        <div className={`d-flex align-items-center gap-3 ${className}`}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#e9ecef"
                    strokeWidth={strokeWidth}
                />
                {data.map((item, index) => {
                    const percentage = total > 0 ? item.value / total : 0;
                    const strokeLength = percentage * circumference;
                    const offset = currentOffset;
                    currentOffset += strokeLength;

                    return (
                        <circle
                            key={index}
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke={item.color || defaultColors[index % defaultColors.length]}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${strokeLength} ${circumference}`}
                            strokeDashoffset={-offset}
                            transform={`rotate(-90 ${size / 2} ${size / 2})`}
                            style={{ transition: 'stroke-dasharray 0.5s ease' }}
                        />
                    );
                })}
                {centerText && (
                    <text
                        x={size / 2}
                        y={size / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fw-bold"
                        style={{ fontSize: '1.2rem' }}
                    >
                        {centerText}
                    </text>
                )}
            </svg>

            {showLegend && (
                <div className="d-flex flex-column gap-1">
                    {data.map((item, index) => (
                        <div key={index} className="d-flex align-items-center gap-2">
                            <div
                                style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '2px',
                                    backgroundColor: item.color || defaultColors[index % defaultColors.length]
                                }}
                            />
                            <small className="text-muted">
                                {item.label}: <strong>{item.value}</strong>
                            </small>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * Progress Ring Component
 * Shows a circular progress indicator
 */
export const ProgressRing = ({
    value = 0,
    max = 100,
    size = 80,
    strokeWidth = 8,
    color = '#0d6efd',
    showPercentage = true,
    label = '',
    className = ''
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(value / max, 1);
    const strokeDashoffset = circumference * (1 - percentage);

    return (
        <div className={`text-center ${className}`}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#e9ecef"
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
                {showPercentage && (
                    <text
                        x={size / 2}
                        y={size / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fw-bold"
                        style={{ fontSize: `${size / 5}px` }}
                    >
                        {Math.round(percentage * 100)}%
                    </text>
                )}
            </svg>
            {label && <small className="text-muted d-block mt-1">{label}</small>}
        </div>
    );
};

/**
 * Mini Sparkline Component
 * Simple line trend indicator
 */
export const Sparkline = ({
    data = [],
    width = 100,
    height = 30,
    color = '#0d6efd',
    showArea = true,
    className = ''
}) => {
    if (data.length < 2) return null;

    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - minValue) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    const areaPath = `M0,${height} L${points} L${width},${height} Z`;

    return (
        <svg width={width} height={height} className={className}>
            {showArea && (
                <polygon
                    points={`0,${height} ${points} ${width},${height}`}
                    fill={color}
                    opacity={0.1}
                />
            )}
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

/**
 * Horizontal Bar (for rankings/comparisons)
 */
export const HorizontalBar = ({
    label,
    value,
    maxValue,
    color = '#0d6efd',
    showValue = true,
    className = ''
}) => {
    const percentage = Math.min((value / maxValue) * 100, 100);

    return (
        <div className={`mb-2 ${className}`}>
            <div className="d-flex justify-content-between align-items-center mb-1">
                <small className="text-muted">{label}</small>
                {showValue && <small className="fw-bold">{value}</small>}
            </div>
            <div className="bg-light rounded" style={{ height: '8px' }}>
                <div
                    className="rounded"
                    style={{
                        width: `${percentage}%`,
                        height: '100%',
                        backgroundColor: color,
                        transition: 'width 0.3s ease'
                    }}
                />
            </div>
        </div>
    );
};

export default { SimpleBarChart, DonutChart, ProgressRing, Sparkline, HorizontalBar };
