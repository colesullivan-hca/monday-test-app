async function generatePdf(data) {
    const { PDFDocument } = PDFLib;

    // 2. Fetch your static PDF template
    const url = './ISTE.pdf';
    const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

    // 3. Load the PDF and get the form fields
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    // 4. Fill the fields by their names (set in Acrobat/LibreOffice)
    // If the field name doesn't exist, this will throw an error, 
    // so use try/catch or check if field exists.
//   form.getTextField('full_name').setText(userData.name);
//   form.getTextField('date_field').setText(userData.date);
    form.getTextField('PAGE').setText('1');
    form.getTextField('AGENCY NAME').setText('');
    form.getTextField('VOUCHER').setText(''); // Business Unit
    form.getTextField('VOUCHER NUMBER').setText('');
    form.getTextField('SUPPLIER NAME').setText('');
    form.getTextField('SUPPLIER ID').setText('');
    // form.getDropdown('Dropdown5').set(''); // attendance
    // form.getDropdown('Dropdown6').select(''); // meeting length
    form.getTextField('SUPPLIER ID').setText('');
    form.getTextField('DATE ITEMIZED COSTS BY DAYRow1.0').setText('700');


    // 5. Save the PDF and create a local URL
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(blob);

    // 6. Push to the iframe
    document.getElementById('pdf-viewer').src = pdfUrl;
}

async function downloadFilledPdf() {
    const { PDFDocument } = PDFLib;

    // ... (Your code to load and fill the PDF form) ...
    
    // 1. Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save();

    // 2. Create a Blob from the PDF bytes
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    // 3. Create a download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'filled-form.pdf'; // The name the user will see

    // 4. Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 5. Clean up the URL object to free memory
    URL.revokeObjectURL(link.href);
}

async function intit () {
    try {
        const context = await monday.get('context');
        currentItemId = context?.data?.itemId;
        currentBoardId = context?.data?.boardId;

        if (!currentItemId || !currentBoardId) {
        throw new Error('Please open this in a monday item view.');
        }

        const query = `query {
        items(ids: [${currentItemId}]) {
            column_values {
                id
                text
                type
            }
            subitems {
                id
                column_values {
                    id
                    text
                    type
                }
            }
        }
        }`;

        const res = await monday.api(query);
        const item = res?.data?.items?.[0];
        const subitems = item?.subitems;

        if (!item) {
            throw new Error('Could not load item data.');
        }

        const agencyName = item.column_values.find(c => c.id === "text_mm32f6m5");
        const businessUnit = item.column_values.find(c => c.id === "text_mm32vzws");
        const voucherNumber = item.column_values.find(c => c.id === "text_mm33zev5");
        const supplierName = item.column_values.find(c => c.id === "text_mm32xqxs");
        const supplierID = item.column_values.find(c => c.id === "text_mm32zdd2");
        const attendance = item.column_values.find(c => c.id === "color_mm322zrz");
        const lengthOfMeeting = item.column_values.find(c => c.id === "color_mm32ddxm");
        const license = item.column_values.find(c => c.id === "text_mm328jte");
        const vehicleModel = item.column_values.find(c => c.id === "text_mm32vtpv");
        const vehicleType = item.column_values.find(c => c.id === "color_mm32b86r");
        const postOfDuty = item.column_values.find(c => c.id === "text_mm32ydbs");
        const residence = item.column_values.find(c => c.id === "text_mm32f377");
        const prepaidVoucher = item.column_values.find(c => c.id === "boolean_mm32z5q7");
        const finalVoucher = item.column_values.find(c => c.id === "boolean_mm32n5pq");
        const perDiemBasedOn = item.column_values.find(c => c.id === "color_mm33q5cs");

        // const 
    }
    catch (err) {

    }
}