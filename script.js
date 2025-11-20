// Enhanced JavaScript for interactive elements and dynamic popup positioning
document.addEventListener('DOMContentLoaded', function() {
    // Handle statement reveals (for future use)
    const statements = document.querySelectorAll('.statement');
    statements.forEach(statement => {
        statement.addEventListener('click', function() {
            const answer = this.querySelector('.answer');
            if (answer) {
                answer.style.display = answer.style.display === 'block' ? 'none' : 'block';
                this.classList.toggle('revealed');
            }
        });
    });

    // Dynamic popup positioning based on screen position
    function adjustPopupPosition() {
        const chapterItems = document.querySelectorAll('.chapter-item, .appendix-item');
        const viewportHeight = window.innerHeight;
        
        chapterItems.forEach(item => {
            const popup = item.querySelector('.section-popup');
            if (!popup) return;
            
            const rect = item.getBoundingClientRect();
            const itemTop = rect.top;
            const itemHeight = rect.height;
            const popupHeight = popup.offsetHeight || 250; // Estimate if not visible
            
            // Check if popup would extend below viewport when positioned downward
            const spaceBelow = viewportHeight - (itemTop + itemHeight);
            const spaceAbove = itemTop;
            
            // Reset any previous positioning classes
            popup.classList.remove('popup-upward', 'popup-downward');
            
            // Be more conservative: only position upward if there's significantly more space above
            // and the popup would definitely not fit below with comfortable margin
            const comfortableMargin = 20; // Require comfortable space
            if (spaceBelow < (popupHeight + comfortableMargin) && spaceAbove > (popupHeight + comfortableMargin)) {
                popup.classList.add('popup-upward');
            } else {
                popup.classList.add('popup-downward');
            }
        });
    }
    
    // Adjust popup positions on page load and scroll
    adjustPopupPosition();
    window.addEventListener('scroll', adjustPopupPosition);
    window.addEventListener('resize', adjustPopupPosition);
    
    // Add hover event listeners for better control
    const chapterItems = document.querySelectorAll('.chapter-item, .appendix-item');
    chapterItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            // Small delay to ensure popup is visible before adjusting position
            setTimeout(adjustPopupPosition, 10);
        });
    });
});
