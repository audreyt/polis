import React from "react";
import RawDataExport from "../RawDataExport.jsx";

const ExportReport = ({ report_id, conversation }) => {
  return (
    <div style={{ padding: '20px' }}>
      <RawDataExport 
        conversation={conversation} 
        report_id={report_id} 
      />
    </div>
  );
};

export default ExportReport;