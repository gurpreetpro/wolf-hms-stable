import React, { useState } from "react";
import { Modal, Button, Form, Row, Col, Table } from "react-bootstrap";
import { Printer, X, FileText } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { HospitalPrintHeader, HospitalPrintFooter } from "./print";
import useHospitalProfile from "../hooks/useHospitalProfile";
import "../styles/print.css";

/**
 * DeathCertificatePrint - Medical Certificate of Cause of Death
 * Compliant with Form 4/4A under Registration of Births and Deaths Act, India
 */
const DeathCertificatePrint = ({
  show,
  onHide,
  patient,
  admission,
  doctorName,
  doctorRegNo,
}) => {
  const { hospitalProfile } = useHospitalProfile();

  // Form state for editable fields
  const [formData, setFormData] = useState({
    dateOfDeath: new Date().toISOString().split("T")[0],
    timeOfDeath: new Date().toTimeString().slice(0, 5),
    placeOfDeath: "Hospital",
    primaryCause: "",
    secondaryCause: "",
    otherConditions: "",
    mannerOfDeath: "Natural",
    pregnancyRelated: "Not Applicable",
    autopsyPerformed: "No",
    autopsyFindings: "",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePrint = () => window.print();

  if (!patient) return null;

  const qrData = JSON.stringify({
    type: "death_certificate",
    patient: patient.name,
    patientId: patient.id,
    dateOfDeath: formData.dateOfDeath,
    hospital: hospitalProfile?.name,
    certifiedBy: doctorName,
  });

  const certificateNumber = `DC-${new Date().getFullYear()}-${String(
    patient.id
  ).padStart(6, "0")}`;

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      className="death-certificate-modal print-modal"
    >
      <Modal.Header
        closeButton
        className="bg-dark text-white border-0 no-print"
      >
        <Modal.Title className="d-flex align-items-center">
          <FileText size={24} className="me-2" />
          Medical Certificate of Cause of Death
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        {/* Configuration Panel (No Print) */}
        <div className="p-3 bg-light border-bottom no-print">
          <Row className="g-3">
            <Col md={3}>
              <Form.Label className="small fw-bold">Date of Death</Form.Label>
              <Form.Control
                type="date"
                size="sm"
                value={formData.dateOfDeath}
                onChange={(e) => handleChange("dateOfDeath", e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Form.Label className="small fw-bold">Time of Death</Form.Label>
              <Form.Control
                type="time"
                size="sm"
                value={formData.timeOfDeath}
                onChange={(e) => handleChange("timeOfDeath", e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Place of Death</Form.Label>
              <Form.Select
                size="sm"
                value={formData.placeOfDeath}
                onChange={(e) => handleChange("placeOfDeath", e.target.value)}
              >
                <option>Hospital</option>
                <option>Home</option>
                <option>En Route to Hospital</option>
                <option>Other</option>
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label className="small fw-bold">Manner of Death</Form.Label>
              <Form.Select
                size="sm"
                value={formData.mannerOfDeath}
                onChange={(e) => handleChange("mannerOfDeath", e.target.value)}
              >
                <option>Natural</option>
                <option>Accident</option>
                <option>Suicide</option>
                <option>Homicide</option>
                <option>Pending Investigation</option>
                <option>Could Not Be Determined</option>
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">
                Primary Cause of Death (Disease/Condition)
              </Form.Label>
              <Form.Control
                type="text"
                size="sm"
                placeholder="e.g., Acute Myocardial Infarction"
                value={formData.primaryCause}
                onChange={(e) => handleChange("primaryCause", e.target.value)}
              />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">
                Secondary/Antecedent Cause
              </Form.Label>
              <Form.Control
                type="text"
                size="sm"
                placeholder="e.g., Coronary Artery Disease"
                value={formData.secondaryCause}
                onChange={(e) => handleChange("secondaryCause", e.target.value)}
              />
            </Col>
            <Col md={6}>
              <Form.Label className="small fw-bold">
                Other Significant Conditions
              </Form.Label>
              <Form.Control
                type="text"
                size="sm"
                placeholder="e.g., Diabetes Mellitus, Hypertension"
                value={formData.otherConditions}
                onChange={(e) =>
                  handleChange("otherConditions", e.target.value)
                }
              />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">
                Autopsy Performed?
              </Form.Label>
              <Form.Select
                size="sm"
                value={formData.autopsyPerformed}
                onChange={(e) =>
                  handleChange("autopsyPerformed", e.target.value)
                }
              >
                <option>No</option>
                <option>Yes</option>
                <option>Pending</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">
                Pregnancy Related?
              </Form.Label>
              <Form.Select
                size="sm"
                value={formData.pregnancyRelated}
                onChange={(e) =>
                  handleChange("pregnancyRelated", e.target.value)
                }
              >
                <option>Not Applicable</option>
                <option>Not Pregnant</option>
                <option>Pregnant at Death</option>
                <option>Within 42 days of delivery</option>
                <option>Within 1 year of delivery</option>
              </Form.Select>
            </Col>
          </Row>
        </div>

        {/* Printable Content */}
        <div
          className="death-certificate-content p-4"
          id="death-certificate-print-area"
        >
          <HospitalPrintHeader
            title="MEDICAL CERTIFICATE OF CAUSE OF DEATH"
            subtitle="(Under Section 10/10A of the Registration of Births and Deaths Act, 1969)"
          />

          {/* Certificate Number and Date */}
          <div className="d-flex justify-content-between mb-4">
            <div>
              <strong>Certificate No:</strong> {certificateNumber}
            </div>
            <div>
              <strong>Date of Issue:</strong>{" "}
              {new Date().toLocaleDateString("en-IN")}
            </div>
          </div>

          {/* Deceased Information */}
          <div className="mb-4 p-3 border rounded">
            <h6
              className="border-bottom pb-2 mb-3 text-uppercase fw-bold"
              style={{ fontSize: "0.9rem" }}
            >
              Part I: Particulars of the Deceased
            </h6>
            <Table borderless size="sm" className="mb-0">
              <tbody>
                <tr>
                  <td width="25%">
                    <strong>Name:</strong>
                  </td>
                  <td width="25%">{patient.name}</td>
                  <td width="25%">
                    <strong>Patient ID:</strong>
                  </td>
                  <td width="25%">{patient.id}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Age:</strong>
                  </td>
                  <td>{patient.age} years</td>
                  <td>
                    <strong>Gender:</strong>
                  </td>
                  <td>{patient.gender}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Father's/Spouse Name:</strong>
                  </td>
                  <td colSpan={3}>
                    {patient.guardian_name || "_______________________"}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Address:</strong>
                  </td>
                  <td colSpan={3}>
                    {patient.address || "_______________________"}
                  </td>
                </tr>
                {admission && (
                  <>
                    <tr>
                      <td>
                        <strong>Date of Admission:</strong>
                      </td>
                      <td>
                        {new Date(admission.admission_date).toLocaleDateString(
                          "en-IN"
                        )}
                      </td>
                      <td>
                        <strong>Ward/Bed:</strong>
                      </td>
                      <td>
                        {admission.ward_name} / {admission.bed_number}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </Table>
          </div>

          {/* Death Details */}
          <div className="mb-4 p-3 border rounded">
            <h6
              className="border-bottom pb-2 mb-3 text-uppercase fw-bold"
              style={{ fontSize: "0.9rem" }}
            >
              Part II: Death Particulars
            </h6>
            <Table borderless size="sm" className="mb-0">
              <tbody>
                <tr>
                  <td width="25%">
                    <strong>Date of Death:</strong>
                  </td>
                  <td width="25%">
                    {new Date(formData.dateOfDeath).toLocaleDateString("en-IN")}
                  </td>
                  <td width="25%">
                    <strong>Time of Death:</strong>
                  </td>
                  <td width="25%">{formData.timeOfDeath} hrs</td>
                </tr>
                <tr>
                  <td>
                    <strong>Place of Death:</strong>
                  </td>
                  <td>{formData.placeOfDeath}</td>
                  <td>
                    <strong>Manner of Death:</strong>
                  </td>
                  <td>{formData.mannerOfDeath}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Autopsy Performed:</strong>
                  </td>
                  <td>{formData.autopsyPerformed}</td>
                  <td>
                    <strong>Pregnancy Related:</strong>
                  </td>
                  <td>{formData.pregnancyRelated}</td>
                </tr>
              </tbody>
            </Table>
          </div>

          {/* Cause of Death (Medical Certification) */}
          <div className="mb-4 p-3 border rounded">
            <h6
              className="border-bottom pb-2 mb-3 text-uppercase fw-bold"
              style={{ fontSize: "0.9rem" }}
            >
              Part III: Medical Certification of Cause of Death
            </h6>
            <Table bordered size="sm">
              <thead className="table-light">
                <tr>
                  <th width="10%"></th>
                  <th width="60%">Cause of Death</th>
                  <th width="30%">Approximate Interval</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="fw-bold">I(a)</td>
                  <td>
                    <strong>Immediate Cause:</strong>
                    <br />
                    {formData.primaryCause || "___________________________"}
                  </td>
                  <td>_______ (hours/days)</td>
                </tr>
                <tr>
                  <td className="fw-bold">I(b)</td>
                  <td>
                    <strong>Antecedent Cause:</strong>
                    <br />
                    {formData.secondaryCause || "___________________________"}
                  </td>
                  <td>_______ (days/months)</td>
                </tr>
                <tr>
                  <td className="fw-bold">II</td>
                  <td colSpan={2}>
                    <strong>
                      Other Significant Conditions Contributing to Death:
                    </strong>
                    <br />
                    {formData.otherConditions || "___________________________"}
                  </td>
                </tr>
              </tbody>
            </Table>
          </div>

          {/* Certification */}
          <div className="mb-4 p-3 bg-light border rounded">
            <p className="mb-3" style={{ lineHeight: 1.8 }}>
              I hereby certify that I attended the deceased during illness and
              that the particulars given above are true to the best of my
              knowledge and belief.
            </p>
          </div>

          {/* Signatures */}
          <Row className="mt-5 pt-4">
            <Col xs={4} className="text-center">
              <div className="border-top pt-2 mx-3">
                <strong>{doctorName || "Medical Officer"}</strong>
                <br />
                <small className="text-muted">
                  Reg. No: {doctorRegNo || "____________"}
                </small>
                <br />
                <small className="text-muted">Signature & Seal</small>
              </div>
            </Col>
            <Col xs={4} className="text-center">
              <QRCodeSVG value={qrData} size={80} />
              <br />
              <small className="text-muted">Scan to Verify</small>
            </Col>
            <Col xs={4} className="text-center">
              <div className="border-top pt-2 mx-3">
                <strong>Hospital Stamp</strong>
                <br />
                <div style={{ height: "50px" }}></div>
              </div>
            </Col>
          </Row>

          <HospitalPrintFooter
            showTimestamp={true}
            disclaimer="This certificate is issued for official purposes under the Registration of Births and Deaths Act, 1969."
            showPageNumber={false}
          />
        </div>
      </Modal.Body>
      <Modal.Footer className="bg-light no-print">
        <Button variant="outline-secondary" onClick={onHide}>
          <X size={16} className="me-1" /> Close
        </Button>
        <Button variant="dark" onClick={handlePrint}>
          <Printer size={16} className="me-2" />
          Print Certificate
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeathCertificatePrint;
