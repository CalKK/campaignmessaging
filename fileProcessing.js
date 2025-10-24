const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function cleanFile(filePath) {
  try {
    console.log('Starting clean process for file:', filePath);

    let workbook;
    try {
      workbook = XLSX.readFile(filePath);
    } catch (readError) {
      console.error('XLSX read error:', readError.message || readError);
      throw new Error('Failed to read Excel file. Ensure it is a valid .xlsx/.xls file, saved without merged cells or complex formatting. Try saving as .xlsx from Excel.');
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    let rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`Cleaning file with ${rows.length} rows`);

    // File cleaning section: Pre-process rows to handle common Excel issues and format to exact spec (A: name, B: phone)
    // Remove completely empty rows, trim all cell values, handle null/undefined, ensure at least 2 columns
    const cleanedRows = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
        console.log(`Cleaned: Skipped empty row ${i + 1}`);
        continue;
      }

      // Clean each cell: convert to string, trim, replace null/undefined with empty string
      const cleanedRow = row.map(cell => {
        if (cell === null || cell === undefined) return '';
        return String(cell).trim();
      });

      // Ensure row has at least 2 columns (pad with empty if shorter, truncate if longer but keep first 2 for spec)
      if (cleanedRow.length < 2) {
        while (cleanedRow.length < 2) {
          cleanedRow.push('');
        }
      } else if (cleanedRow.length > 2) {
        // Keep only first 2 columns for exact format (A and B)
        const finalRow = cleanedRow.slice(0, 2);
        cleanedRows.push(finalRow);
        console.log(`Cleaned: Truncated row ${i + 1} to first 2 columns`);
      }

      cleanedRows.push(cleanedRow);
    }

    console.log(`Cleaning complete. Processed ${cleanedRows.length} rows.`);

    // No need to create directory for /tmp, it exists in serverless environments

    // Generate cleaned Excel file
    const cleanedWorkbook = XLSX.utils.book_new();
    const cleanedSheet = XLSX.utils.aoa_to_sheet(cleanedRows);
    XLSX.utils.book_append_sheet(cleanedWorkbook, cleanedSheet, 'Cleaned Data');
    const cleanedFilePath = `/tmp/cleaned_${Date.now()}.xlsx`;
    XLSX.writeFile(cleanedWorkbook, cleanedFilePath);
    console.log(`Cleaned file generated: ${cleanedFilePath}`);

    // Check if file was written
    if (fs.existsSync(cleanedFilePath)) {
      console.log('Cleaned file exists');
    } else {
      throw new Error('Failed to write cleaned file');
    }

    return { cleanedRows, cleanedFilePath };
  } catch (error) {
    console.error('Error in cleanFile:', error.message || error);
    throw error;
  }
}

function detectHeader(row) {
  if (!row || row.length < 2) return false;
  const firstCell = String(row[0]).toLowerCase().trim();
  const secondCell = String(row[1]).toLowerCase().trim();
  return firstCell.includes('name') || secondCell.includes('tel') || firstCell.includes('phone') || secondCell.includes('phone');
}

function validateContacts(cleanedRows) {
  const validContacts = [];
  const errors = [];
  let startIndex = 0;

  // Dynamic header detection
  if (cleanedRows.length > 0 && detectHeader(cleanedRows[0])) {
    console.log('Detected header row:', cleanedRows[0]);
    startIndex = 1;
  }

  const totalDataRows = cleanedRows.length - startIndex;
  console.log(`Data rows to process: ${totalDataRows} (starting from index ${startIndex})`);

  for (let i = startIndex; i < cleanedRows.length; i++) {
    const rowIndex = i + 1; // 1-based for user display
    const row = cleanedRows[i];

    console.log(`\n--- Row ${rowIndex} ---`);
    console.log(`Cleaned row: ${JSON.stringify(row)}`);

    if (row.length < 2) {
      errors.push({ rowIndex, name: '', phone: '', error: 'Row too short (needs at least 2 columns)' });
      continue;
    }

    const name = row[0];
    const telephone = row[1];

    console.log(`Name: '${name}'`);
    console.log(`Telephone: '${telephone}'`);

    if (!name || name === '') {
      errors.push({ rowIndex, name: '', phone: telephone, error: 'Name is empty or missing' });
      continue;
    }

    if (!telephone || telephone === '') {
      errors.push({ rowIndex, name, phone: '', error: 'Telephone is empty or missing' });
      continue;
    }

    // Sanitize and validate telephone number for WhatsApp (international format)
    let sanitizedTelephone = telephone.replace(/[^0-9]/g, '');
    console.log(`Initial sanitized telephone: '${sanitizedTelephone}', Length: ${sanitizedTelephone.length}`);

    // Handle Excel truncation: if length is 9 and starts with 1, assume it's 11xxx truncated to 1xxx, prepend 254
    if (sanitizedTelephone.length === 9 && sanitizedTelephone.startsWith('1')) {
      sanitizedTelephone = '254' + sanitizedTelephone;
      console.log(`Auto-added Kenyan country code for 1xxx number (likely Excel-truncated 11xxx): '${sanitizedTelephone}', New length: ${sanitizedTelephone.length}`);
    }
    // Auto-detect and add Kenyan country code for local 9-digit numbers starting with 7
    else if (sanitizedTelephone.length === 9 && sanitizedTelephone.startsWith('7')) {
      sanitizedTelephone = '254' + sanitizedTelephone;
      console.log(`Auto-added Kenyan country code: '${sanitizedTelephone}', New length: ${sanitizedTelephone.length}`);
    }

    // Final validation: 10-15 digits for international WhatsApp numbers
    if (sanitizedTelephone.length < 10 || sanitizedTelephone.length > 15) {
      errors.push({ rowIndex, name, phone: telephone, error: `Invalid phone length after sanitization (must be 10-15 digits for international format). Current: ${sanitizedTelephone.length} digits. Original: ${telephone}` });
      continue;
    }

    // Additional check: Should start with country code (not 0 for local)
    if (sanitizedTelephone.startsWith('0')) {
      errors.push({ rowIndex, name, phone: telephone, error: `Phone starts with 0 (local format). WhatsApp requires international (e.g., 254 instead of 07). Current: ${sanitizedTelephone}` });
      continue;
    }

    console.log(`Valid: Processed ${name} with phone ${sanitizedTelephone}`);
    validContacts.push({ name, phone: sanitizedTelephone });
  }

  return { validContacts, errors };
}

module.exports = { cleanFile, validateContacts, detectHeader };
