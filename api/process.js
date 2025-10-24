const multer = require('multer');
const { cleanFile, validateContacts, detectHeader } = require('../fileProcessing.js');
const { generateLinks } = require('../messaging.js');

const upload = multer({ dest: '/tmp/' });

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      res.status(500).json({ error: 'File upload failed' });
      return;
    }

    const filePath = req.file.path;
    let contacts = [];
    let summary = { found: 0, errors: 0, errorDetails: [] };

    try {
      const { cleanedRows } = cleanFile(filePath);
      const { validContacts, errors } = validateContacts(cleanedRows);

      // Calculate found as total data rows processed
      let startIndex = 0;
      if (cleanedRows.length > 0 && detectHeader(cleanedRows[0])) {
        startIndex = 1;
      }
      summary.found = cleanedRows.length - startIndex;
      summary.errors = errors.length;
      summary.errorDetails = errors;

      contacts = generateLinks(validContacts);

      console.log(`Final summary - Found: ${summary.found}, Successful contacts: ${contacts.length}, Errors: ${summary.errors}`);

      res.json({ contacts, summary });
    } catch (error) {
      console.error('Error in process endpoint:', error);
      if (error.message.includes('Failed to read Excel file')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Error processing file: ' + (error.message || 'Unknown error') });
    }
  });
}
