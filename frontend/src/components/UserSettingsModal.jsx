import React from 'react';
import useGlobalStore, { defaultSettings } from '../../GlobalStore';
import '../styles/UserSettingsModal.css'; // small layout rules

export default function UserSettingsModal({ open, onClose }) {
  const {
    settings,
    updateSetting,
    resetSettingsToDefault,
    saveCurrentAsUser,
    fetchUserSettings,
  } = useGlobalStore();

  if (!open) return null;

  const handleNumber = (key) => (e) =>
    updateSetting(key, parseFloat(e.target.value));

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div
        className="settings-modal"
        onClick={(e) => e.stopPropagation()} // keep clicks inside
      >
        <h3>User Settings</h3>

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
                    columns="40"
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

        </fieldset>

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
