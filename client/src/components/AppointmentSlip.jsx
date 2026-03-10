import React from 'react';
import { Modal, Button, Table } from 'react-bootstrap';
import { Printer } from 'lucide-react';
import useHospitalProfile from '../hooks/useHospitalProfile';

const AppointmentSlip = ({ show, onHide, data }) => {
    const { hospitalProfile, getFormattedAddress } = useHospitalProfile();

    if (!data) return null;

    const print = () => {
        window.print();
        // Optional: onHide();
    };

    return (
        <Modal show={show} onHide={onHide} size="md" className="receipt-modal">
            <Modal.Header closeButton>
                <Modal.Title>Appointment Slip</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div id="printable-slip" className="p-4 border text-center">
                    {hospitalProfile?.logo_url && (
                        <img src={hospitalProfile.logo_url} alt="Hospital Logo" style={{ maxHeight: '40px', marginBottom: '10px' }} />
                    )}
                    <h3 className="fw-bold">{hospitalProfile?.name || 'Hospital'}</h3>
                    <p className="text-muted small">{getFormattedAddress() || 'OPD Appointment Token'}</p>
                    <hr />

                    <h1 className="display-1 fw-bold text-primary mb-3">#{data.token_number}</h1>

                    <div className="text-start mb-3">
                        <p><strong>Patient:</strong> {data.patient_name}</p>
                        <p><strong>Doctor:</strong> {data.doctor_name || 'Unassigned'}</p>
                        <p><strong>Date:</strong> {new Date(data.visit_date || data.created_at).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> {new Date().toLocaleTimeString()}</p>
                    </div>

                    <div className="alert alert-light border small mt-4">
                        Please wait in the waiting area until your number is called.
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Close</Button>
                <Button variant="primary" onClick={print}><Printer size={16} className="me-2" /> Print Slip</Button>
            </Modal.Footer>
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .receipt-modal, .receipt-modal * {
                        visibility: visible;
                    }
                    .receipt-modal .modal-dialog {
                        width: 100%;
                        margin: 0;
                        position: absolute;
                        left: 0;
                        top: 0;
                    }
                    .receipt-modal .modal-content {
                        border: none;
                        box-shadow: none;
                    }
                    .receipt-modal .modal-header, .receipt-modal .modal-footer {
                        display: none; 
                    }
                    #printable-slip {
                        border: none !important;
                        width: 100%;
                        height: 100%;
                        padding: 20px !important;
                    }
                }
            `}</style>
        </Modal>
    );
};

export default AppointmentSlip;

