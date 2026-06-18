import { useState } from 'react';
import { WorkforceProvider } from './store/WorkforceContext';
import { Layout } from './components/layout/Layout';
import { WorkforceDashboard } from './components/dashboard/WorkforceDashboard';
import { PeopleConfig } from './components/people/PeopleConfig';
import { RulesConfig } from './components/rules/RulesConfig';
import { TestDataGenerator } from './components/testdata/TestDataGenerator';
import { AppointmentDiary } from './components/diary/AppointmentDiary';
import { RotaTool } from './components/rota/RotaTool';
import './index.css';

function AppContent() {
  const [activeView, setActiveView] = useState('dashboard');

  const view = (() => {
    switch (activeView) {
      case 'dashboard': return <WorkforceDashboard />;
      case 'diary': return <AppointmentDiary />;
      case 'rota': return <RotaTool />;
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
