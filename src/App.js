
import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [summary, setSummary] = useState({ found: 0, errors: 0, errorDetails: [] });
  const [errorDetails, setErrorDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
  };

  const handleClean = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an Excel file first.');
      return;
    }

    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/clean', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob', // For file download
      });

      // Create download link for cleaned file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'cleaned_contacts.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setError('File cleaned and downloaded as "cleaned_contacts.xlsx". Upload this cleaned file to generate links.');
    } catch (error) {
      console.error('Error cleaning file:', error);
      console.log('Full error response:', error.response);
      const errorMessage = error.response?.data?.error || 'An error occurred while cleaning the file. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an Excel file first.');
      return;
    }

    setLoading(true);
    setError('');
    setErrorDetails([]);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setContacts(response.data.contacts);
      setSummary(response.data.summary);
      setErrorDetails(response.data.summary.errorDetails || []);
    } catch (error) {
      console.error('Error processing file:', error);
      const errorMessage = error.response?.data?.error || 'An error occurred while processing the file. Please check the file format and try again. Ensure it has names in Column A and telephone numbers in Column B.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header text-center">
              <h1>Personalized Message</h1>
            </div>
            <div className="card-body">
              <p className="card-text">
                Upload an Excel file (.xls or .xlsx) with two columns: <strong>name</strong> (Column A) and <strong>telephone</strong> (Column B, e.g., 254712345678 for Kenyan international or 712345678 local - auto-converts to international). The app will generate personalized "Click to Chat" WhatsApp links using the provided message template. Click the buttons below to open WhatsApp and send messages manually—one at a time.
              </p>

              <p className="card-text text-muted small">
                <strong>Instructions:</strong> After uploading, review the summary and detailed errors if any. For Kenyan numbers, local 8-digit (starting with 7 or 1) will auto-add '254'. If errors occur, check specific row issues below. Valid links will appear as buttons; clicking opens WhatsApp Web or app with the pre-filled message.
              </p>
              <form onSubmit={handleClean}>
                <div className="mb-3">
                  <input className="form-control" type="file" accept=".xls,.xlsx" onChange={handleFileChange} disabled={loading} />
                </div>
                <button type="submit" className="btn btn-secondary w-100 mb-2" disabled={loading || !file}>
                  {loading ? 'Cleaning...' : 'Clean File'}
                </button>
              </form>
              <p className="text-muted small mb-3">
                <strong>Tip:</strong> If your file has formatting issues, use "Clean File" first to standardize it (trims data, fixes columns, removes empties). Then upload the downloaded "cleaned_contacts.xlsx" to generate links.
              </p>
              <form onSubmit={handleSubmit}>
                <button type="submit" className="btn btn-primary w-100" disabled={loading || !file}>
                  {loading ? 'Processing file...' : 'Generate Links'}
                </button>
              </form>

              {error && (
                <div className="alert alert-danger mt-4">
                  {error}
                </div>
              )}

              {summary.found > 0 && (
                <div className="alert alert-info mt-4">
                  Processing complete. Found: <strong>{summary.found}</strong> contacts, Errors: <strong>{summary.errors}</strong>. {contacts.length > 0 ? `${contacts.length} valid links generated.` : 'No valid contacts found. Check detailed errors below.'}
                </div>
              )}

              {errorDetails.length > 0 && (
                <div className="mt-4">
                  <h3>Detailed Errors ({errorDetails.length})</h3>
                  <p className="text-muted">Review these specific issues in your file:</p>
                  <ul className="list-group">
                    {errorDetails.map((err, index) => (
                      <li key={index} className="list-group-item">
                        <strong>Row {err.rowIndex}:</strong> {err.name || 'N/A'} - {err.phone || 'N/A'} - {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {contacts.length > 0 && (
                <div className="mt-4">
                  <h2>Generated Links ({contacts.length})</h2>
                  <p className="text-muted">Click each "Send Message" button to open WhatsApp with the personalized message for manual sending.</p>
                  <ul className="list-group">
                    {contacts.map((contact, index) => (
                      <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                        <span>{contact.name} ({contact.telephone})</span>
                        <a
                          href={contact.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-success btn-sm"
                        >
                          Send Message
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.found > 0 && contacts.length === 0 && (
                <div className="alert alert-warning mt-4">
                  No valid links generated. Common issues: Phone numbers too short/long, missing names, or invalid format. Review detailed errors above and try a cleaned file.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
