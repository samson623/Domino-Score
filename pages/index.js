import React from 'react';

export default function Home() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <iframe
        src="/index.html"
        title="Domino Score"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}
