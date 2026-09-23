import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Tenders } from './pages/Tenders';
import { Requirements } from './pages/Requirements';
import { Bidders } from './pages/Bidders';
import { BidderProfile } from './pages/BidderProfile';
import { DocumentVerification } from './pages/DocumentVerification';
import { Compliance } from './pages/Compliance';
import { RiskSignals } from './pages/RiskSignals';
import { ProcurementGraph } from './pages/ProcurementGraph';
import { Comparison } from './pages/Comparison';
import { Export } from './pages/Export';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        {({ activeTenderId, refreshTenders }) => (
          <Routes>
            <Route path="/" element={<Dashboard tenderId={activeTenderId} />} />
            <Route
              path="/tenders"
              element={
                <Tenders
                  onSelectTender={(id) => {
                    refreshTenders();
                  }}
                />
              }
            />
            <Route path="/requirements" element={<Requirements tenderId={activeTenderId} />} />
            <Route path="/bidders" element={<Bidders tenderId={activeTenderId} />} />
            <Route path="/bidders/:id" element={<BidderProfile />} />
            <Route path="/verification" element={<DocumentVerification tenderId={activeTenderId} />} />
            <Route path="/compliance" element={<Compliance tenderId={activeTenderId} />} />
            <Route path="/risk-signals" element={<RiskSignals tenderId={activeTenderId} />} />
            <Route path="/risk-graph" element={<ProcurementGraph tenderId={activeTenderId} />} />
            <Route path="/comparison" element={<Comparison tenderId={activeTenderId} />} />
            <Route path="/export" element={<Export tenderId={activeTenderId} />} />
          </Routes>
        )}
      </Layout>
    </BrowserRouter>
  );
};

export default App;
