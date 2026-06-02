import { useState } from 'react';
import { WorkforceProvider } from './store/WorkforceContext';
import { Layout } from './components/layout/Layout';
import { WorkforceDashboard } from './components/dashboard/WorkforceDashboard';
import { PeopleConfig } from './components/people/PeopleConfig';
import { RulesConfig } from './components/rules/RulesConfig';
import { TestDataGenerator } from './components/testdata/TestDataGenerator';
import './index.css';

function AppContent() {
  const [activeView, setActiveView] = useState('dashboard');

  const view = (() => {
    switch (activeView) {
      case 'dashboard': return <WorkforceDashboard />;
      case 'people': return <PeopleConfig />;
      case 'rules': return <RulesConfig />;
      case 'testdata': return <TestDataGenerator />;
      default: return <WorkforceDashboard />;
    }
  })();

  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      {view}
    </Layout>
  );
}

export default function App() {
  return (
    <WorkforceProvider>
      <AppContent />
    </WorkforceProvider>
  );
}
