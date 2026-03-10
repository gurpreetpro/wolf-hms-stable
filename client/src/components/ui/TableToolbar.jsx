import React, { useState } from 'react';
import { Form, InputGroup, Button, Row, Col } from 'react-bootstrap';
import { Calendar, Search, X, Filter } from 'lucide-react';

/**
 * Date Range Filter Component
 * Allows filtering data by date range (today, week, month, custom)
 */
export const DateRangeFilter = ({
    onFilterChange,
    showPresets = true,
    className = ''
}) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activePreset, setActivePreset] = useState('all');

    const presets = [
        { key: 'all', label: 'All' },
        { key: 'today', label: 'Today' },
        { key: 'week', label: 'This Week' },
        { key: 'month', label: 'This Month' }
    ];

    const getDateRange = (preset) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (preset) {
            case 'today':
                return { start: today, end: today };
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                return { start: weekStart, end: today };
            case 'month':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                return { start: monthStart, end: today };
            default:
                return { start: null, end: null };
        }
    };

    const handlePresetClick = (preset) => {
        setActivePreset(preset);
        const range = getDateRange(preset);
        onFilterChange?.(range);
    };

    const handleCustomRange = () => {
        if (startDate && endDate) {
            setActivePreset('custom');
            onFilterChange?.({
                start: new Date(startDate),
                end: new Date(endDate)
            });
        }
    };

    const clearFilter = () => {
        setStartDate('');
        setEndDate('');
        setActivePreset('all');
        onFilterChange?.({ start: null, end: null });
    };

    return (
        <div className={`d-flex align-items-center gap-2 flex-wrap ${className}`}>
            {showPresets && (
                <div className="btn-group btn-group-sm">
                    {presets.map(p => (
                        <Button
                            key={p.key}
                            variant={activePreset === p.key ? 'primary' : 'outline-primary'}
                            onClick={() => handlePresetClick(p.key)}
                            size="sm"
                        >
                            {p.label}
                        </Button>
                    ))}
                </div>
            )}

            <InputGroup size="sm" style={{ width: 'auto' }}>
                <InputGroup.Text><Calendar size={14} /></InputGroup.Text>
                <Form.Control
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ maxWidth: '130px' }}
                />
                <InputGroup.Text>to</InputGroup.Text>
                <Form.Control
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ maxWidth: '130px' }}
                />
                <Button variant="outline-primary" onClick={handleCustomRange}>
                    <Filter size={14} />
                </Button>
            </InputGroup>

            {activePreset !== 'all' && (
                <Button variant="outline-secondary" size="sm" onClick={clearFilter}>
                    <X size={14} /> Clear
                </Button>
            )}
        </div>
    );
};

/**
 * Table Search Component
 * Quick search input for filtering table data
 */
export const TableSearch = ({
    value,
    onChange,
    placeholder = 'Search...',
    className = ''
}) => {
    return (
        <InputGroup size="sm" className={className} style={{ maxWidth: '300px' }}>
            <InputGroup.Text><Search size={14} /></InputGroup.Text>
            <Form.Control
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            {value && (
                <Button
                    variant="outline-secondary"
                    onClick={() => onChange('')}
                >
                    <X size={14} />
                </Button>
            )}
        </InputGroup>
    );
};

/**
 * Status Filter Dropdown
 * Filter by status with common hospital statuses
 */
export const StatusFilter = ({
    value,
    onChange,
    options = ['All', 'Pending', 'In Progress', 'Completed', 'Cancelled'],
    className = ''
}) => {
    return (
        <Form.Select
            size="sm"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={className}
            style={{ maxWidth: '150px' }}
        >
            {options.map(opt => (
                <option key={opt} value={opt === 'All' ? '' : opt}>
                    {opt}
                </option>
            ))}
        </Form.Select>
    );
};

/**
 * Combined Table Toolbar
 * Includes search, status filter, and date range in one component
 */
const TableToolbar = ({
    searchValue,
    onSearchChange,
    searchPlaceholder,
    statusValue,
    onStatusChange,
    statusOptions,
    showDateFilter = false,
    onDateFilterChange,
    className = ''
}) => {
    return (
        <div className={`d-flex justify-content-between align-items-center flex-wrap gap-2 ${className}`}>
            <div className="d-flex gap-2 align-items-center">
                <TableSearch
                    value={searchValue}
                    onChange={onSearchChange}
                    placeholder={searchPlaceholder}
                />
                {statusOptions && (
                    <StatusFilter
                        value={statusValue}
                        onChange={onStatusChange}
                        options={statusOptions}
                    />
                )}
            </div>
            {showDateFilter && (
                <DateRangeFilter onFilterChange={onDateFilterChange} />
            )}
        </div>
    );
};

export default TableToolbar;
