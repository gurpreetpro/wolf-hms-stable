import React from 'react';
import { Card, Table } from 'react-bootstrap';
// Placeholder for Lab Trending

const LabTrendView = ({ labResults }) => {
    // Group results by test name
    const tests = {};
    if (labResults) {
        labResults.forEach(res => {
            if (!tests[res.test_name]) tests[res.test_name] = [];
            tests[res.test_name].push(res);
        });
    }

    const testNames = Object.keys(tests);

    return (
        <div className="lab-trends mt-4">
            <h6 className="fw-bold mb-3">Lab Trends & History</h6>
            {testNames.length > 0 ? (
                <div className="row">
                    {testNames.map(name => (
                        <div key={name} className="col-md-6 mb-3">
                            <Card className="h-100">
                                <Card.Header className="py-2 bg-light fw-bold small">{name}</Card.Header>
                                <Card.Body className="p-0">
                                    <Table size="sm" borderless striped className="mb-0 small">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Result</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tests[name].slice(0, 5).map((t, idx) => (
                                                <tr key={idx}>
                                                    <td>{new Date(t.requested_at).toLocaleDateString()}</td>
                                                    <td>
                                                        {t.result_json ? JSON.stringify(t.result_json) : <span className="text-muted">Pending</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-muted text-center py-4 border rounded bg-light">
                    No lab history available for trending.
                </div>
            )}
        </div>
    );
};

export default LabTrendView;
