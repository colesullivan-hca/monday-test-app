const monday = mondaySdk();

async function handleViewerApproval() {
  try {
    const context = await monday.get("context");
    const { itemId } = context.data;

    // 1. Inject the Item ID into the hidden form field
    const inputField = document.getElementById("formItemIdInput");
    inputField.value = `Approval-For-Item-${itemId}`;

    // 2. Programmatically submit the hidden HTML form
    const form = document.getElementById("approvalForm");
    form.submit();

    // 3. Trigger the success toast
    monday.execute("notice", { 
      message: "Approval submitted successfully!", 
      type: "success",
      timeout: 4000
    });

  } catch (error) {
    console.error("Submission failed:", error);
  }
}

handleViewerApproval()