import React, { useEffect } from 'react';
import useGlobalStore from '../../GlobalStore';
import '../styles/ClinicalDataModal.css'; // small layout rules


export default function ClinicalDataModal({ open, onClose }) {
    const {clinSettings, setClinSummary, setProcedure} = useGlobalStore();

    if (!open) return null;
    return (
        <div className="clinical-data-overlay" onClick={onClose}>
            <div
                className="clinical-data-modal"
                onClick={(e) => e.stopPropagation()} // keep clicks inside
            >
                <div className="clinical-data-content">
                    
                    <h2 style={{ justifyContent: 'center' }}>Clinical Data</h2>


                    <label>
                        Clinical Summary:&nbsp;
                        <textarea rows="2" columns="50" value={clinSettings.summary} onChange={(e) => setClinSummary(e.target.value)} />
                    </label>    

                    <label>
                        Procedure:&nbsp;
                        <textarea rows="2" columns="50" value={clinSettings.procedure} onChange={(e) => setProcedure(e.target.value)} />
                    </label>
                </div>
            </div>
        </div>
    );
}