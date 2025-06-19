import React, { createContext, useState, useEffect } from 'react';
import { getLatestCase } from '../communications/mainServerAPI';

export const CaseContext = createContext({ caseId: '', setCaseId: () => {} });

export function CaseProvider({ children }) {
  const [caseId, setCaseId] = useState('');

  useEffect(() => {
    async function fetchCase() {
      try {
        const data = await getLatestCase();
        setCaseId(data.case_id);
      } catch (error) {
        console.error('Error fetching latest case:', error);
      }
    }
    fetchCase();
  }, []);

  return (
    <CaseContext.Provider value={{ caseId, setCaseId }}>
      {children}
    </CaseContext.Provider>
  );
}