import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import useGlobalStore from '../../GlobalStore';
import {
  updateClinicalFields,  getClinicalData,  clinicalDocsRetrieve, uploadClinicalDoc, deleteClinicalDocs, processClinicalDocsLlmQuery 
} from '../communications/mainServerAPI';
import '../styles/ClinicalDataModal.css';

export default function ClinicalDataModal({ open, onClose }) {
  const { caseId, clinSettings, setClinicalFieldValue, fetchClinicalData } = useGlobalStore();

  const [selected, setSelected] = useState(() => new Set());
  const fileInputRef = useRef(null);
  const [docSummary, setDocSummary] = useState('');
  const [showDocs, setShowDocs] = useState(false);
  const [loading, setLoading] = useState(false);
  const downOnOverlay = useRef(false);

  const [outputMsg, setOutputMsg] = useState('');

  async function refreshDocs() {
    if (!caseId) return;
    const res = await clinicalDocsRetrieve(caseId);
    setDocSummary(res);
  }

  useEffect(() => {
    if (open && caseId) {
      refreshDocs();
    }
  }, [open, caseId]);

  useEffect(() => {
  if (!docSummary.count) {
      setOutputMsg('No documents to regenerate clinical data from');
  } else if (!selected.size) {
    setOutputMsg('No fields selected');
  } else {
    setOutputMsg(
      'Click "Regenerate" to launch an LLM query for the selected fields'
    );
    }
  }, [docSummary, selected]);

  const taRefs = useRef({});

  const fitTextarea = (name) => {
    const ta = taRefs.current[name];
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, window.innerHeight * 0.2) + 'px';
  };

  useLayoutEffect(() => {
    Object.keys(taRefs.current).forEach(fitTextarea);
  }, [clinSettings]);

  const Spinner = () => (
  <span className="spinner" aria-label="loading" />
  );

  if (!open) return null;


  /* ───────────── bulk actions ───────────── */
  const saveSelected = async () => {
    const payload = {};
    Object.entries(clinSettings).forEach(([key, { value }]) => {
      if (selected.has(key)) payload[key] = value;
    });
    if (Object.keys(payload).length) await updateClinicalFields(caseId, payload);
  };

  const restoreSelected = async () => {
    const { clinical } = await getClinicalData(caseId);
    Object.keys(clinSettings).forEach((key) => {
      if (selected.has(key)) setClinicalFieldValue(key, clinical[key] ?? '');
    });
  };

  const restoreSpecimenData = async () => {
    const { clinical } = await getClinicalData(caseId);
    setClinicalFieldValue('specimen', clinical.specimen ?? {});
  };

  /* ───────────── regenerate - llm call ─────────────*/
  const handleRegenerate = async () => {
    if (loading || !docSummary.count || !selected.size) return;
    setLoading(true);
    setOutputMsg('Please wait for the LLM to process the documents…');

    try {
      const newVals = await processClinicalDocsLlmQuery(caseId, Array.from(selected), clinSettings.specimen.value);
      Object.entries(newVals).forEach(([k,v]) => {
        if (k !== 'specimen') {
          setClinicalFieldValue(k, v);
        }
      });
      setOutputMsg(
        `Query completed. Selected fields updated: ${Array.from(selected).join(
          ', '
        )}.  Click save selected to store this data in the database.`
      );
      selected.forEach(fitTextarea);
    } catch (e) {
      console.error('Error during LLM query:', e);
      setOutputMsg(`Error: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  /* ───────────── single‑field helpers ───────────── */

  const toggle = (f) => {
    selected.has(f)? setSelected((s) => new Set([...s].filter((i) => i !== f)))
                  : setSelected((s) => new Set([...s, f])); 
  }

  const clearField  = (f) => {
    setClinicalFieldValue(f, '');
    fitTextarea(f);
  };

  /* ───────────── specimen field ───────────── */
  const handleSpecimenChange = (field, value) => {
    let specimen = { ...clinSettings.specimen, [field]: value };
    setClinicalFieldValue('specimen', specimen);
  };

  const saveSpecimenData = () => {
    // Create a clean copy of the specimen data to send
    const payload = { ...clinSettings.specimen };

    // If the date is empty or invalid, set it to null before saving.
    // An empty string is a common cause of invalid date errors.
    if (!payload.date || isNaN(new Date(payload.date))) {
      payload.date = null;
    }

    updateClinicalFields(caseId, { specimen: payload });
  };

  /* ───────────── docs upload ───────────── */
  const handleFileChosen = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    await uploadClinicalDoc(caseId, file.name, dataUrl);
    refreshDocs();
    fileInputRef.current.value = '';
  };

  async function handleDelete(url) {
    if (!caseId) return;
    const res = await deleteClinicalDocs(caseId, [url]);
    setDocSummary(res);
  }

  return (
    <div
      className="hist-overlay"
      onMouseDown={(e) => {downOnOverlay.current = e.target === e.currentTarget;}}
      onClick={(e) => {
        if (downOnOverlay.current && e.target === e.currentTarget) {
          onClose();
          downOnOverlay.current = false;
        }
      }}
    >
      <div className="clin-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Clinical Data</h2>

        <div className="clin-specimen-header">
          <div className="specimen-fields">
            <div className="specimen-summary-field">
              <label>Specimen Summary</label>
              <input
                type="text"
                className="specimen-summary-input"
                value={clinSettings.specimen.value.summary || ''}
                onChange={(e) => handleSpecimenChange('summary', e.target.value)}
                placeholder="e.g., Left breast, core biopsy"
              />
            </div>
            <div className="specimen-date-field">
              <label>Date Collected</label>
              <input
                type="date"
                className="specimen-date-input"
                value={clinSettings.specimen.value.date || ''}
                onChange={(e) => handleSpecimenChange('date', e.target.value)}
              />
            </div>
          </div>
          <div className="specimen-actions">
            <button
              onClick={saveSpecimenData}
              className="specimen-btn"
              title="Save specimen data to database"
            >
              Save Specimen
            </button>
            <button
              onClick={restoreSpecimenData}
              className="specimen-btn"
              title="Restore specimen data from database"
            >
              Restore
            </button>
          </div>
        </div>

        <hr className="clin-separator" />

        <div className="clin-fields">
          {Object.entries(clinSettings)
            .filter(([key]) => key !== 'specimen')
            .map(([key, { label, value }]) => (
              <div key={key} className="clin-field">
                <label className="clin-chk">
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => toggle(key)}
                  />
                  {label}
                </label>
                <textarea
              
                  className="clin-text"
                  ref={(el) => {
                    taRefs.current[key] = el;
                    fitTextarea(key);
                  }}
                  value={value}
                  onChange={(e) => {
                    setClinicalFieldValue(key, e.target.value);
                    fitTextarea(key);
                  }}
                  onInput={() => fitTextarea(key)}
                  rows={1}
                />

                <div className="clin-actions">
                  <button onClick={() =>  {
                    clearField(key);
                    fitTextarea(key);
                  }} title="Clear this field">
                    Clear
                  </button>
                  <button
                    onClick={() => updateClinicalFields(caseId, { [key]: value })}
                    title="Save only this field"
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* documents footer */}
        <div className="clin-docs">
          <div className="clin-doc-actions">
            <button onClick={() => {
              selected.size < (Object.keys(clinSettings).length-1) ? setSelected(new Set(Object.keys(clinSettings).filter(key => key !== 'specimen'))) : setSelected(new Set())
            }}
                    title="Select all or no fields">Select All/None</button>

            <button onClick={
              () => {
                setOutputMsg(`Fields saved to database: ${Array.from(selected).join(', ')}`);
                saveSelected();
              }
            }
                    title="Save selected fields to database"
                    >Save Selected</button>
            <button onClick={
              () => {
                setOutputMsg(`Fields restored from database: ${Array.from(selected).join(', ')}`);
                restoreSelected();
              }
            }
                    title="Restore selected fields from database">Restore Selected</button>
            <button onClick={() => fileInputRef.current?.click()}
                    title="Upload supporting clinical document">Upload Doc</button>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt"
                   style={{ display: 'none' }} onChange={handleFileChosen} />
            <span className="clin-doc-toggle"
              onClick={() => setShowDocs(!showDocs)}>
              <b>Documents:</b> {docSummary.count} {docSummary.count ? (showDocs ? '▲' : '▼') : null}
            </span>

          </div>
          {showDocs && (
            <ul className="clin-doc-list">
              {docSummary.docs.length === 0 && <li>(none)</li>}
              {docSummary.docs.map(d => (
                <li key={d.url} className='clin-doc-row'>
                  <a href={`http://${location.hostname}:10000${d.url}`}
                    target="_blank" rel="noopener noreferrer">
                    {d.title}
                  </a>
                  <button className="doc-del-btn" onClick={() => handleDelete(d.url)}
                          title="Delete this document">Delete 🗑</button>
                </li>
              ))}
            </ul>
          )}
          <div className="regen-row">
            <button
              title="Use LLM to regenerate selected fields from clinical documents"
              className="regen-btn"
              disabled={!docSummary.docs || !selected.size || loading}
              onClick={handleRegenerate}
            >
              {loading ? <Spinner /> : 'Regenerate'}
            </button>

            <div className="regen-output">{outputMsg}</div>
          </div>

        </div>
      </div>
    </div>
  );
};
