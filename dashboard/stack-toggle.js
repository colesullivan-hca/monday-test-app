document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => {
        // Remove 'active' state from all buttons and add to the clicked one
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const target = button.getAttribute('data-target');
        const stacks = document.querySelectorAll('.stack');
        
        stacks.forEach(stack => {
            if (target === 'all') {
                stack.classList.remove('hidden-stack');
            } else {
                if (stack.classList.contains(target)) {
                    stack.classList.remove('hidden-stack');
                } else {
                    stack.classList.add('hidden-stack');
                }
            }
        });
    });
});