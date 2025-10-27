import React from 'react';
import { useData } from '../hooks/useData';

const TestSimCards: React.FC = () => {
  const { simCards, loading } = useData();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Test Sim Cards</h2>
      <pre>{JSON.stringify(simCards, null, 2)}</pre>
    </div>
  );
};

export default TestSimCards;