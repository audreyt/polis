import React, { useState, useEffect } from 'react';
import net from '../../util/net';

const TopicDataProvider = ({ report_id, children }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topicData, setTopicData] = useState(null);
  const [narrativeData, setNarrativeData] = useState(null);

  useEffect(() => {
    if (!report_id) return;

    setLoading(true);
    setError(null);

    // Fetch both data sources in parallel
    Promise.all([
      // Fetch topics
      net.polisGet("/api/v3/delphi", { report_id }),
      // Fetch narrative reports  
      net.polisGet("/api/v3/delphi/reports", { report_id })
    ])
    .then(([topicsResponse, narrativeResponse]) => {
      console.log("TopicDataProvider: Data loaded successfully");

      // Set topic data if available
      if (topicsResponse && topicsResponse.status === "success") {
        setTopicData(topicsResponse);
      }

      // Set narrative data if available
      if (narrativeResponse && narrativeResponse.status === "success") {
        setNarrativeData(narrativeResponse);
      }

      setLoading(false);
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      setError(error);
      setLoading(false);
    });
  }, [report_id]);

  // Only render children when we have data
  if (loading) {
    return <div className="loading">Loading topics...</div>;
  }

  if (error) {
    return <div className="error">Error loading data: {error.message}</div>;
  }

  if (!topicData || topicData.message?.includes('No LLM topics found for this conversation')) {
    return (
      <div className="topic-content">
        <p style={{ color: '#666', fontStyle: 'italic' }}>{topicData.message}</p>
        <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>
          To generate narrative reports, use the "Generate Narrative Report" button in the <a target="_blank" rel="noreferrer" href={`/commentsReport/${report_id}`}>Comments Report page.</a>
        </p>
      </div>
    )
  }

  // Pass data to children
  return children({ topicData, narrativeData });
};

export default TopicDataProvider;