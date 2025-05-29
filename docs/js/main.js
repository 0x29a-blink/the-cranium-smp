
document.addEventListener('DOMContentLoaded', function() {
    // Add fuzzy search functionality
    const searchInput = document.getElementById('mod-search');
    const searchClear = document.getElementById('search-clear');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            const modCards = document.querySelectorAll('.mod-card');
            
            // Show/hide clear button
            if (searchTerm === '') {
                searchClear.classList.remove('visible');
                // Show all cards if search is empty
                modCards.forEach(card => {
                    card.style.display = '';
                });
            } else {
                searchClear.classList.add('visible');
                modCards.forEach(card => {
                    // Search in title
                    const title = card.querySelector('.mod-title');
                    // Search in description
                    const description = card.querySelector('.mod-description');
                    // Search in authors
                    const authors = card.querySelector('.mod-info-item:nth-child(2)');
                    // Search in categories
                    const categories = card.querySelector('.mod-categories');
                    
                    // Combine all searchable text
                    let searchableText = '';
                    if (title) searchableText += title.textContent.toLowerCase() + ' ';
                    if (description) searchableText += description.textContent.toLowerCase() + ' ';
                    if (authors) searchableText += authors.textContent.toLowerCase() + ' ';
                    if (categories) searchableText += categories.textContent.toLowerCase() + ' ';
                    
                    // Also search in data attributes for jar names etc.
                    const dataCategories = card.getAttribute('data-categories');
                    if (dataCategories) searchableText += dataCategories.toLowerCase() + ' ';
                    
                    // Split search term into words for more flexible matching
                    const searchWords = searchTerm.split(/\s+/);
                    
                    // Card is visible if ALL search words are found in the searchable text
                    const visible = searchWords.every(word => searchableText.includes(word));
                    
                    card.style.display = visible ? '' : 'none';
                });
            }
            
            // Show/hide sections based on visible cards
            document.querySelectorAll('.mod-section').forEach(section => {
                const visibleCards = Array.from(section.querySelectorAll('.mod-card')).filter(card => 
                    card.style.display !== 'none'
                );
                
                section.style.display = visibleCards.length === 0 ? 'none' : '';
            });
        });
        
        // Add clear button functionality
        if (searchClear) {
            searchClear.addEventListener('click', function() {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
                searchInput.focus();
            });
        }
    }
    
    // Add category filter functionality
    const categoryFilters = document.querySelectorAll('.category-filter');
    categoryFilters.forEach(filter => {
        filter.addEventListener('click', function(e) {
            e.preventDefault();
            const category = this.dataset.category;
            const modCards = document.querySelectorAll('.mod-card');
            
            if (category === 'all') {
                modCards.forEach(card => card.style.display = '');
                
                // Show all sections
                document.querySelectorAll('.mod-section').forEach(section => {
                    section.style.display = '';
                });
                
                return;
            }
            
            modCards.forEach(card => {
                const categories = card.dataset.categories ? card.dataset.categories.split(',') : [];
                if (categories.includes(category)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
            
            // Update section visibility based on whether they have visible cards
            document.querySelectorAll('.mod-section').forEach(section => {
                const visibleCards = section.querySelectorAll('.mod-card[style=""]').length;
                if (visibleCards === 0) {
                    section.style.display = 'none';
                } else {
                    section.style.display = '';
                }
            });
            
            // Update active filter
            document.querySelectorAll('.category-filter').forEach(f => {
                f.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
    
    // Copy buttons functionality
    document.querySelectorAll('.mod-btn.copy').forEach(btn => {
        btn.addEventListener('click', function() {
            const textToCopy = this.dataset.copy;
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    // Change button text temporarily
                    const originalText = this.innerHTML;
                    this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => {
                        this.innerHTML = originalText;
                    }, 2000);
                });
            }
        });
    });
    
    // We've removed the find mod functionality as requested
    
    // We're removing the expandable functionality since all cards are expanded by default
    
    // Add click handlers for compact changelog items
    document.querySelectorAll('.compact-item-header.clickable').forEach(header => {
        header.addEventListener('click', function() {
            const item = this.closest('.compact-changelog-item');
            if (item) {
                item.classList.toggle('expanded');
            }
        });
    });
});
        