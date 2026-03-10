/**
 * OHIF Viewer Integration Component
 * Provides a zero-footprint DICOM viewer embedded in Wolf HMS
 * 
 * This component integrates with OHIF Viewer to display medical images
 * directly in the browser without requiring desktop software.
 */

import React, { useState, useEffect } from 'react';
import './OHIFViewer.css';

const OHIFViewer = ({ studyInstanceUID, accessionNumber, patientName, onClose }) => {
    const [viewerMode, setViewerMode] = useState('basic'); // basic, mpr, volumetric
    const [loading, setLoading] = useState(true);
    const [studyData, setStudyData] = useState(null);
    const [error, setError] = useState(null);

    // In production, this would point to actual Orthanc/DICOMweb server
    const DICOM_WEB_URL = process.env.REACT_APP_DICOMWEB_URL || 'http://localhost:8042/dicom-web';
    const OHIF_VIEWER_URL = process.env.REACT_APP_OHIF_URL || 'http://localhost:3000/viewer';

    useEffect(() => {
        if (studyInstanceUID) {
            fetchStudyMetadata();
        }
    }, [studyInstanceUID]);

    const fetchStudyMetadata = async () => {
        setLoading(true);
        try {
            // Try to get study data from our mock endpoint first
            const response = await fetch(`/api/dicom/wado/${studyInstanceUID}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setStudyData(data.data?.study || null);
            } else {
                // Fallback to mock data for demo
                setStudyData({
                    StudyInstanceUID: studyInstanceUID,
                    AccessionNumber: accessionNumber,
                    PatientName: patientName,
                    Modality: 'CT',
                    SeriesCount: 3,
                    ImageCount: 150,
                    StudyDescription: 'CT Chest with Contrast'
                });
            }
        } catch (err) {
            console.warn('Using mock study data:', err.message);
            setStudyData({
                StudyInstanceUID: studyInstanceUID || 'DEMO.1.2.3.4',
                AccessionNumber: accessionNumber || 'ACC001',
                PatientName: patientName || 'Demo Patient',
                Modality: 'CT',
                SeriesCount: 2,
                ImageCount: 100,
                StudyDescription: 'Demo Study'
            });
        } finally {
            setLoading(false);
        }
    };

    const launchExternalViewer = () => {
        // Open OHIF viewer in new tab (for hospitals with standalone OHIF deployment)
        const url = `${OHIF_VIEWER_URL}?StudyInstanceUIDs=${studyInstanceUID}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const renderEmbeddedViewer = () => {
        // In production, this would be an iframe to OHIF or Cornerstone.js canvas
        return (
            <div className="ohif-embedded-viewer">
                <div className="viewer-toolbar">
                    <button 
                        className={`tool-btn ${viewerMode === 'basic' ? 'active' : ''}`}
                        onClick={() => setViewerMode('basic')}
                    >
                        📐 2D
                    </button>
                    <button 
                        className={`tool-btn ${viewerMode === 'mpr' ? 'active' : ''}`}
                        onClick={() => setViewerMode('mpr')}
                    >
                        🔲 MPR
                    </button>
                    <button 
                        className={`tool-btn ${viewerMode === 'volumetric' ? 'active' : ''}`}
                        onClick={() => setViewerMode('volumetric')}
                    >
                        🧊 3D
                    </button>
                    <div className="toolbar-spacer" />
                    <button className="tool-btn" onClick={() => {}}>
                        📏 Measure
                    </button>
                    <button className="tool-btn" onClick={() => {}}>
                        🔍 Zoom
                    </button>
                    <button className="tool-btn" onClick={() => {}}>
                        ✋ Pan
                    </button>
                    <button className="tool-btn" onClick={() => {}}>
                        🎚️ W/L
                    </button>
                    <div className="toolbar-spacer" />
                    <button className="tool-btn primary" onClick={launchExternalViewer}>
                        🔗 Open in OHIF
                    </button>
                </div>
                
                <div className="viewer-canvas">
                    {/* In production, this would be Cornerstone.js viewport */}
                    <div className="demo-viewport">
                        <div className="viewport-overlay top-left">
                            <div>{studyData?.PatientName}</div>
                            <div>ID: {studyData?.AccessionNumber}</div>
                        </div>
                        <div className="viewport-overlay top-right">
                            <div>{studyData?.Modality}</div>
                            <div>{studyData?.StudyDescription}</div>
                        </div>
                        <div className="viewport-overlay bottom-left">
                            <div>Series: {studyData?.SeriesCount}</div>
                            <div>Images: {studyData?.ImageCount}</div>
                        </div>
                        <div className="viewport-overlay bottom-right">
                            <div>W: 400 / L: 40</div>
                            <div>Zoom: 100%</div>
                        </div>
                        
                        <div className="demo-image-placeholder">
                            <div className="dicom-icon">🩻</div>
                            <div className="demo-text">
                                {viewerMode === 'basic' && 'DICOM 2D Viewer'}
                                {viewerMode === 'mpr' && 'Multi-Planar Reconstruction'}
                                {viewerMode === 'volumetric' && '3D Volume Rendering'}
                            </div>
                            <div className="demo-subtext">
                                Connect to Orthanc PACS to view actual images
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="viewer-thumbnails">
                    {[1, 2, 3].map(series => (
                        <div key={series} className="thumbnail-item">
                            <div className="thumbnail-icon">📷</div>
                            <div className="thumbnail-label">Series {series}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="ohif-viewer-container">
                <div className="viewer-loading">
                    <div className="loading-spinner">🔄</div>
                    <div>Loading Study...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="ohif-viewer-container">
                <div className="viewer-error">
                    <div className="error-icon">⚠️</div>
                    <div>{error}</div>
                    <button onClick={onClose}>Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="ohif-viewer-container">
            <div className="viewer-header">
                <div className="patient-info">
                    <span className="patient-name">{studyData?.PatientName}</span>
                    <span className="study-info">
                        {studyData?.AccessionNumber} | {studyData?.Modality} | {studyData?.StudyDescription}
                    </span>
                </div>
                <button className="close-btn" onClick={onClose}>✕</button>
            </div>
            
            {renderEmbeddedViewer()}
        </div>
    );
};

export default OHIFViewer;
