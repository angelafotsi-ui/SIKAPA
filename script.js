// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Handle waitlist form submission
function handleWaitlist(event) {
    event.preventDefault();
    
    const email = event.target.querySelector('input[type="email"]').value;
    
    if (email) {
        // Show success message
        const form = event.target;
        const originalButton = form.querySelector('button');
        const originalText = originalButton.innerText;
        
        originalButton.innerText = '✓ Successfully joined!';
        originalButton.disabled = true;
        originalButton.style.backgroundColor = '#4caf50';
        
        // Reset after 3 seconds
        setTimeout(() => {
            form.reset();
            originalButton.innerText = originalText;
            originalButton.disabled = false;
            originalButton.style.backgroundColor = '';
        }, 3000);
        
        // Here you would normally send the email to your backend
        console.log('Email submitted:', email);
    }
}

// Add scroll animation for elements
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards and solution cards for animation
document.querySelectorAll('.feature-card, .solution-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});

// Add active state to navigation links based on scroll position
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section');
    
    sections.forEach(section => {
        const top = section.offsetTop - 100;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        
        if (window.scrollY >= top && window.scrollY < top + height && id) {
            document.querySelectorAll('.nav-links a').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${id}`) {
                    link.style.color = '#0066cc';
                    link.style.fontWeight = 'bold';
                }
            });
        }
    });
});

// Make CTA button scroll to waitlist
document.querySelectorAll('.cta-button').forEach(button => {
    button.addEventListener('click', () => {
        const waitlist = document.querySelector('#waitlist');
        if (waitlist) {
            waitlist.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
