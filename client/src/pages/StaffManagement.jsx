import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Table, Badge, Form, Modal, Alert, Row, Col, Dropdown } from 'react-bootstrap';
import { Users, Plus, Search, MoreVertical, ChevronLeft, ChevronRight, Edit2, Key, Trash2 } from 'lucide-react';
import api from '../utils/axiosInstance';
import { TableSearch, StatusBadge } from '../components/ui';

const DEPARTMENTS = [
    'General Medicine',
    'Cardiology',
    'Orthopedics',
    'Pediatrics',
    'Gynecology',
    'ENT',
    'Ophthalmology',
    'Dermatology',
    'Neurology',
    'Emergency'
];



const StaffManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'doctor',
        department: '',
        consultation_fee: 500,
        created_at: new Date().toISOString().split('T')[0]
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            // Use configured API instance (interceptor handles token)
            const res = await api.get(`/api/auth/users?t=${Date.now()}`);
            // Handle wrapped response
            const usersData = res.data.data || res.data;
            setUsers(Array.isArray(usersData) ? usersData : []);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.message || 'Failed to load staff data');
            
            // Auto-logout if 401 (Safety net)
            if (err.response?.status === 401) {
                 window.location.href = '/login';
            }
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        // For number inputs, convert to integer to avoid string concatenation issues
        const processedValue = type === 'number' ? (value === '' ? '' : parseInt(value)) : value;
        setFormData({ ...formData, [name]: processedValue });
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            if (formData.id) {
                // Update existing user
                const updateData = { ...formData };
                if (!updateData.password) delete updateData.password; // Don't send empty password

                await api.put(`/api/auth/users/${formData.id}`, updateData);
                setSuccess('User updated successfully');
            } else {
                // Create new user
                await api.post('/api/auth/register', formData);
                setSuccess('User created successfully');
            }

            setShowModal(false);
            fetchUsers();
            setFormData({
                username: '',
                email: '',
                password: '',
                role: 'doctor',
                department: '',
                consultation_fee: 500,
                created_at: new Date().toISOString().split('T')[0]
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Operation failed');
        }
    };

    const toggleUserStatus = async (id, currentStatus) => {
        try {
            await api.put(`/api/auth/users/${id}/status`, { is_active: !currentStatus });
            fetchUsers();
        } catch (error) {
            console.error('Status update error:', error);
            alert('Failed to update status');
        }
    };

    const handleEditUser = (user) => {
        setFormData({
            ...user,
            password: '', // Don't show hash
            consultation_fee: parseInt(user.consultation_fee) || 500 // Parse as integer
        });
        setError('');
        setSuccess('');
        setShowModal(true);
    };

    const handleResetPassword = async (user) => {
        const newPassword = prompt(`Enter new password for ${user.username}:`);
        if (!newPassword) return;

        try {
            await api.put(`/api/auth/users/${user.id}/reset-password`, { password: newPassword });
            alert('Password reset successfully');
        } catch (error) {
            console.error(error);
            alert('Failed to reset password');
        }
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(`Are you sure you want to delete ${user.username}?`)) return;
        try {
            await api.delete(`/api/auth/users/${user.id}`);
            fetchUsers();
        } catch (error) {
            console.error(error);
            alert('Failed to delete user');
        }
    };

    const [activeTab, setActiveTab] = useState('staff');
    const [pendingUsers, setPendingUsers] = useState([]);

    useEffect(() => {
        fetchUsers();
        fetchPendingUsers();
    }, []);

    const fetchPendingUsers = async () => {
        try {
            const res = await api.get('/api/auth/users/pending');
            setPendingUsers(res.data.data || res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleApproval = async (id, status) => {
        try {
            await api.put(`/api/auth/users/${id}/approval`, { status });
            fetchPendingUsers();
            fetchUsers();
            alert(status === 'APPROVED' ? 'User Approved' : 'User Rejected');
        } catch (err) {
            alert('Operation failed');
        }
    };

    // Filter users
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = !roleFilter || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const roles = [...new Set(users.map(u => u.role))];

    return (
        <Container className="py-4">
            {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className="fw-bold mb-1">Staff Management</h3>
                    <small className="text-muted">{users.length} active staff members</small>
                </div>
                <div className="d-flex gap-2">
                    <Button
                        variant={activeTab === 'staff' ? 'primary' : 'outline-primary'}
                        onClick={() => setActiveTab('staff')}
                    >
                        Active Staff
                    </Button>
                    <Button
                        variant={activeTab === 'pending' ? 'warning' : 'outline-warning'}
                        onClick={() => setActiveTab('pending')}
                        className="position-relative"
                    >
                        Pending Requests
                        {pendingUsers.length > 0 && (
                            <Badge bg="danger" className="position-absolute top-0 start-100 translate-middle rounded-circle">
                                {pendingUsers.length}
                            </Badge>
                        )}
                    </Button>
                    <Button variant="success" onClick={() => setShowModal(true)} className="d-flex align-items-center gap-2">
                        <Plus size={18} /> Add New
                    </Button>
                </div>
            </div>

            {activeTab === 'pending' ? (
                <Card className="border-0 shadow-sm">
                    <Card.Header className="bg-warning text-dark py-3">
                        <h5 className="mb-0">Pending Approval Requests</h5>
                    </Card.Header>
                    <Card.Body className="p-0">
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4">Applicant</th>
                                    <th>Role</th>
                                    <th>Email</th>
                                    <th>Requested On</th>
                                    <th className="text-end pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-4 text-muted">
                                            No pending requests found.
                                        </td>
                                    </tr>
                                ) : pendingUsers.map(user => (
                                    <tr key={user.id}>
                                        <td className="ps-4 fw-bold">{user.username}</td>
                                        <td><Badge bg="info">{user.role}</Badge></td>
                                        <td>{user.email}</td>
                                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td className="text-end pe-4">
                                            <Button variant="success" size="sm" className="me-2" onClick={() => handleApproval(user.id, 'APPROVED')}>
                                                Approve
                                            </Button>
                                            <Button variant="danger" size="sm" onClick={() => handleApproval(user.id, 'REJECTED')}>
                                                Reject
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            ) : (
                <Card className="border-0 shadow-sm">
                    <Card.Header className="bg-white py-3">
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <TableSearch
                                value={searchTerm}
                                onChange={setSearchTerm}
                                placeholder="Search by name or email..."
                            />
                            <Form.Select
                                size="sm"
                                style={{ width: '150px' }}
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                                <option value="">All Roles</option>
                                {roles.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </Form.Select>
                        </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4">Staff Member</th>
                                    <th>Role</th>
                                    <th>Email</th>
                                    <th>Joined</th>
                                    <th>Status</th>
                                    <th className="text-end pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-4 text-muted">
                                            Loading staff...
                                        </td>
                                    </tr>
                                ) : paginatedUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-4 text-muted">
                                            No staff members found. (Debug: {users.length} items loaded)
                                        </td>
                                    </tr>
                                ) : paginatedUsers.map(user => (
                                    <tr key={user.id}>
                                        <td className="ps-4">
                                            <div className="d-flex align-items-center">
                                                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                                                    {user.username.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="fw-bold">{user.username}</div>
                                                    <small className="text-muted">ID: #{user.id}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <Badge bg="secondary" className="text-uppercase">{user.role}</Badge>
                                        </td>
                                        <td>{user.email}</td>
                                        <td>{new Date(user.created_at).toLocaleDateString('en-IN')}</td>
                                        <td>
                                            <Form.Check
                                                type="switch"
                                                id={`switch-${user.id}`}
                                                checked={user.is_active}
                                                onChange={() => toggleUserStatus(user.id, user.is_active)}
                                                label={user.is_active ? "Active" : "Inactive"}
                                                className={user.is_active ? "text-success" : "text-muted"}
                                            />
                                        </td>
                                        <td className="text-end pe-4">
                                            <Dropdown align="end">
                                                <Dropdown.Toggle variant="link" className="text-muted p-0 text-decoration-none" id={`dropdown-${user.id}`}>
                                                    <MoreVertical size={18} />
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu>
                                                    <Dropdown.Item onClick={() => handleEditUser(user)}>
                                                        <Edit2 size={14} className="me-2" /> Edit Details
                                                    </Dropdown.Item>
                                                    <Dropdown.Item onClick={() => handleResetPassword(user)}>
                                                        <Key size={14} className="me-2" /> Reset Password
                                                    </Dropdown.Item>
                                                    <Dropdown.Divider />
                                                    <Dropdown.Item className="text-danger" onClick={() => handleDeleteUser(user)}>
                                                        <Trash2 size={14} className="me-2" /> Delete
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Card.Footer className="bg-white d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                                Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
                            </small>
                            <div className="d-flex gap-2">
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                >
                                    <ChevronLeft size={16} />
                                </Button>
                                <span className="align-self-center small">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                >
                                    <ChevronRight size={16} />
                                </Button>
                            </div>
                        </Card.Footer>
                    )}
                </Card>
            )}

            {/* Add User Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{formData.id ? 'Edit Staff Member' : 'Add New Staff Member'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCreateUser}>
                    <Modal.Body>
                        {error && <Alert variant="danger">{error}</Alert>}
                        {success && <Alert variant="success">{success}</Alert>}

                        <Form.Group className="mb-3">
                            <Form.Label>Username</Form.Label>
                            <Form.Control
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                required={!formData.id} // Not required for edits
                            />
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Role</Form.Label>
                                    <Form.Select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                    >
                                        <option value="doctor">Doctor</option>
                                        <option value="nurse">Nurse</option>
                                        <option value="receptionist">Receptionist</option>
                                        <option value="lab_tech">Lab Technician</option>
                                        <option value="pharmacist">Pharmacist</option>
                                        <option value="radiologist">Radiologist</option>
                                        <option value="anaesthetist">Anaesthetist</option>
                                        <option value="ward_incharge">Ward Incharge</option>
                                        <option value="billing">Billing</option>
                                        <option value="admin">Admin</option>
                                        <option value="security_guard">Security Guard (App Access)</option>
                                        <option value="security_manager">Security Chief / Manager</option>
                                        <option value="blood_bank_tech">Blood Bank Technician</option>
                                        <option value="housekeeping">Housekeeping</option>
                                    </Form.Select>
                                </Form.Group>
                                {formData.role === 'doctor' && (
                                    <>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Department</Form.Label>
                                        <Form.Select
                                            name="department"
                                            value={formData.department}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">Select Department</option>
                                            {DEPARTMENTS.map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Consultation Fee (₹)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="consultation_fee"
                                            value={formData.consultation_fee || 500}
                                            onChange={handleInputChange}
                                            min="0"
                                            step="50"
                                            placeholder="500"
                                        />
                                        <Form.Text className="text-muted">Default OPD consultation fee for this doctor</Form.Text>
                                    </Form.Group>
                                    </>
                                )}

                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Date of Joining</Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="created_at"
                                        value={formData.created_at}
                                        onChange={handleInputChange}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="success" type="submit">
                            {formData.id ? 'Update Staff Account' : 'Create Account'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container >
    );
};

export default StaffManagement;
