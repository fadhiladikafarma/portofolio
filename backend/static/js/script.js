const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://fadhiladika.pythonanywhere.com';

document.addEventListener('DOMContentLoaded', () => {

    const header = document.querySelector('.header');
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const skillCards = document.querySelectorAll('.skill-card');
    const contactForm = document.getElementById('contactForm');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        const sections = document.querySelectorAll('section[id]');
        const scrollY = window.scrollY + 100;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    skillCards.forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(card);
    });

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(contactForm);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                message: formData.get('message')
            };
            const btn = contactForm.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = 'Mengirim...';
            btn.disabled = true;

            try {
                const res = await fetch(`${API_BASE}/api/contact`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (result.success) {
                    btn.textContent = 'Terkirim!';
                    btn.style.background = '#22c55e';
                    contactForm.reset();
                } else {
                    btn.textContent = 'Gagal! Coba lagi';
                    btn.style.background = '#ef4444';
                }
            } catch {
                btn.textContent = 'Server tidak aktif';
                btn.style.background = '#ef4444';
            }

            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
                btn.disabled = false;
            }, 3000);
        });
    }

    loadProjects();

});

async function loadProjects() {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;

    try {
        const res = await fetch(`${API_BASE}/api/projects`);
        const projects = await res.json();

        if (projects.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;color:#888;padding:40px;">
                    <p>Belum ada proyek. Tambahkan melalui admin panel.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = projects.map(p => `
            <div class="project-card">
                <div class="project-image">
                    <span class="project-placeholder">${p.title}</span>
                </div>
                <div class="project-info">
                    <h3>${p.title}</h3>
                    <p>${p.description}</p>
                    <div class="project-tags">
                        ${p.tags.map(t => `<span>${t.trim()}</span>`).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    } catch {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;color:#888;padding:40px;">
                <p>Gagal memuat proyek. Pastikan backend berjalan di ${API_BASE}.</p>
            </div>
        `;
    }
}