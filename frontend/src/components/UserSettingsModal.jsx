import React, { useEffect } from 'react';
import useGlobalStore, { defaultSettings } from '../../GlobalStore';
import '../styles/UserSettingsModal.css'; // small layout rules
import useDraggable from '../hooks/useDraggable';

export default function UserSettingsModal({ open, onClose }) {
  const {
    settings,
    updateSetting,
    resetSettingsToDefault,
    saveCurrentAsUser,
    fetchUserSettings,
  } = useGlobalStore();

  // draggable modal (always hook before any returns)
  const modalRef = React.useRef(null);
  const initialModalPos = React.useMemo(() => ({ x: 300, y: 60 }), []);
  const [modalKey, setModalKey] = React.useState(0); // to force re-render on modal open

  useEffect(() => {
    if (open) {
      setModalKey((prev) => prev + 1);
    }
  }, [open]);

  const modalPos = useDraggable(modalRef, initialModalPos, modalKey);
  
  if (!open) return null;

  const handleNumber = (key) => (e) =>
    updateSetting(key, parseFloat(e.target.value));
  

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div
        className="settings-modal"
        ref={modalRef}
        style={{ position: 'fixed', top: modalPos.y, left: modalPos.x }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>User Settings</h3>
        <div className="settings-content">

          {/* ---------------- LLM params ---------------- */}
          <fieldset>
              <legend>LLM Settings</legend>
              <label>
                  Reasoning Effort&nbsp;
                  <select
                      value={settings.reasoningEffort}
                      onChange={(e) => updateSetting('reasoningEffort', e.target.value)}
                  >
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                  </select>
              </label>
              <label>
                  Max Output Tokens&nbsp;
                  <input
                      type="number"
                      step="1"
                      min="1"
                      value={settings.maxTokens}
                      onChange={handleNumber('maxTokens')}
                  />
              </label>
              <label>
                  Default Prompt&nbsp;
                  <textarea
                      rows="2"
                      columns="50"
                      value={settings.defaultPrompt}
                      onChange={(e) => updateSetting('defaultPrompt', e.target.value)}
                  >
                      {settings.defaultPrompt}
                  </textarea>
              </label>
              <label>
                  Include LLM history&nbsp;
                  <input
                      type="checkbox"
                      checked={settings.includeHistory}
                      onChange={(e) => updateSetting('includeHistory', e.target.checked)}
                  />
              </label>
              <label>
                  Include Clinical Summary&nbsp;
                  <input
                      type="checkbox"
                      checked={settings.includeClinicalData}
                      onChange={(e) => updateSetting('includeClinicalData', e.target.checked)}
                  />
              </label>
                          <label className="sub-option">
                <input
                  type="radio"
                  name="clinSummaryMode"
                  checked={settings.includeClinSummaryOnly}
                  onChange={() => {
                    updateSetting('includeClinSummaryOnly', true);
                    updateSetting('includeAllClinicalData', false);
                  }}
                  disabled={!settings.includeClinicalData}
                />
                &nbsp;Clinical&nbsp;Summary&nbsp;Only
              </label>
              <label className="sub-option">
                <input
                  type="radio"
                  name="clinSummaryMode"
                  checked={settings.includeAllClinicalData}
                  onChange={() => {
                    updateSetting('includeClinSummaryOnly', false);
                    updateSetting('includeAllClinicalData', true);
                  }}
                  disabled={!settings.includeClinicalData}
                />
                &nbsp;All&nbsp;Clinical&nbsp;Data
              </label>

          </fieldset>

          {/* ---------------- Video controls ---------------- */}
          <fieldset>
            <legend>Video Transform</legend>
            <label>
              Zoom&nbsp;
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={settings.zoom}
                onChange={handleNumber('zoom')}
              />
            </label>
            <label>
              Rotate&nbsp;
              <input
                type="number"
                step="1"
                value={settings.rotate}
                onChange={handleNumber('rotate')}
              />
              °{/* degrees */}
            </label>
            <label>
              Offset X&nbsp;
              <input
                type="number"
                step="1"
                value={settings.offsetX}
                onChange={handleNumber('offsetX')}
              />
            </label>
            <label>
              Offset Y&nbsp;
              <input
                type="number"
                step="1"
                value={settings.offsetY}
                onChange={handleNumber('offsetY')}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.flipX}
                onChange={(e) => updateSetting('flipX', e.target.checked)}
              />
              Flip X
            </label>
          </fieldset>

          

          {/* ---------------- User Interface ---------------- */}
          <fieldset>
            <legend>User Interface</legend>
            <label>
              Sidebar collapsed&nbsp;
              <input
                type="checkbox"
                checked={settings.sidebarCollapsed}
                onChange={(e) => updateSetting('sidebarCollapsed', e.target.checked)}
              />
            </label>
            <label>
              Video controls collapsed&nbsp;
              <input
                type="checkbox"
                checked={settings.videoControlsCollapsed}
                onChange={(e) => updateSetting('videoControlsCollapsed', e.target.checked)}
              />
            </label>
            <label>
              Bottom bar height (px)&nbsp;
              <input
                type="number"
                value={settings.bottomBarHeight}
                onChange={(e) => updateSetting('bottomBarHeight', parseFloat(e.target.value))}
              />
            </label>
            <label>
              Clinical Data Width: &nbsp;
              <span className="readonly-value">{settings.bottomBarClinDataWidth}</span>
            </label>
            <label>
              Input Text Width: &nbsp;
              <span className="readonly-value">{settings.bottomBarInputTextWidth}</span>
            </label>
            <label>
              LLM Response Width: &nbsp;
              <span className="readonly-value">{settings.bottomBarLlmResponseWidth}</span>
            </label>
          </fieldset>
        </div>
        {/* ---------------- actions ---------------- */}
        <div className="settings-actions">
          <button onClick={resetSettingsToDefault}>Reset Default</button>
          <button onClick={saveCurrentAsUser}>Update User</button>
          <button onClick={fetchUserSettings}>Use Stored Settings</button>
        </div>
      </div>
      
    </div>
  );
}
