const modal = document.querySelector('.preview-modal');
const openBtn = document.querySelector('.open-modal');

// Open modal as a backdrop overlay
openBtn.addEventListener('click', () => {
  modal.showModal(); 
});

// Close modal if user clicks outside of it
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.close();
});