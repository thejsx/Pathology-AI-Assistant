import React, { use, useEffect } from 'react';
import useGlobalStore from '../../GlobalStore';
import '../styles/HistoryModal.css';           // small css (below)

export default function HistoryModal({ open, onClose }) {
  const {
    llmHistory,
    selectedHistory,
    toggleHistory,
    selectAllHistory,
    selectNoneHistory,
    clearHistory,
    fetchHistory,
  } = useGlobalStore();

  /* load fresh copy whenever opened */
  useEffect(() => {
    if (open) {
        console.log("Fetching LLM history...");
        fetchHistory().catch(console.error);
        console.log("LLM history:", llmHistory);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="hist-overlay" onClick={onClose}>
      <div
        className="hist-modal"
        onClick={(e) => e.stopPropagation()}    /* keep clicks inside */
      >
        <h2>LLM Call History</h2>

        <div className="hist-list">
          {llmHistory.length === 0 && <p>No history yet.</p>}
          {llmHistory.map((item, idx) => (

            <div key={idx} className="hist-item">
              <label>
                <input
                  type="checkbox"
                  checked={selectedHistory.includes(idx)}
                  onChange={() => toggleHistory(idx)}
                />
                <span className="hist-ts">
                  {
                    (new Date(item.end_ts) - new Date(item.start_ts)) > 10 * 1000 ?
                    new Date(item.start_ts).toLocaleString() + ' - ' + new Date(item.end_ts).toLocaleString() :
                    new Date(item.start_ts).toLocaleString()
                    }
                </span>
              </label>
              <div className="hist-details">
                <p><b>Prompt:</b> {item.prompt}</p>
                <p><b>Images:</b> {item.image_count}</p>
                <div className="hist-response">{item.response}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="hist-actions">
          <button onClick={selectAllHistory}>Select All</button>
          <button onClick={selectNoneHistory}>Select None</button>
          <button onClick={clearHistory}>Clear Selected</button>
        </div>
      </div>
    </div>
  );
}
