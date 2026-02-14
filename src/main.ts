import './style.css';
import { PortalScene } from './portal';
import { WorldScene } from './world';
import { AudioSystem } from './audio';
import gsap from 'gsap';

// ═══════════════════════════════════════════════════════════
// GALLANT SOLUTIONS — MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════

class GallantExperience {
  private portal: PortalScene | null = null;
  private world: WorldScene | null = null;
  private audio: AudioSystem;
  private currentPhase: 'portal' | 'world' = 'portal';

  constructor() {
    this.audio = new AudioSystem();
    this.initPortal();
    this.setupAudioToggle();
  }

  // ─── PHASE 1: PORTAL ───
  private initPortal() {
    const canvas = document.getElementById('portal-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    this.portal = new PortalScene(canvas);

    // Enter button handler
    const enterBtn = document.getElementById('enter-btn');
    if (enterBtn) {
      enterBtn.addEventListener('click', () => this.enterWorld());

      // Hover sound
      enterBtn.addEventListener('mouseenter', () => {
        this.audio.playHoverBlip();
      });
    }
  }

  // ─── ENTER WORLD TRANSITION ───
  private async enterWorld() {
    if (this.currentPhase !== 'portal') return;
    this.currentPhase = 'world';

    const portalContainer = document.getElementById('portal-container')!;
    const worldContainer = document.getElementById('world-container')!;
    const flash = document.getElementById('transition-flash')!;
    const portalUI = document.getElementById('portal-ui')!;

    // Play transition sound
    this.audio.playTransitionWhoosh();
    this.audio.start();

    // Fade out UI — fast
    gsap.to(portalUI, {
      opacity: 0,
      scale: 0.9,
      duration: 0.2,
      ease: 'power2.in',
    });

    // Run portal transition (camera zoom into globe) — shortened
    if (this.portal) {
      await this.portal.transitionOut();
    }

    // Flash effect
    flash.classList.add('active');

    // Wait for flash peak — snappier
    await new Promise(r => setTimeout(r, 150));

    // Show world, hide portal
    worldContainer.style.display = 'block';
    this.initWorld();

    // Allow the world to start rendering before hiding portal
    await new Promise(r => setTimeout(r, 50));

    portalContainer.style.display = 'none';
    portalContainer.style.pointerEvents = 'none';
    portalContainer.style.zIndex = '-1';
    if (this.portal) {
      this.portal.destroy();
      this.portal = null;
    }

    // Remove flash — faster
    await new Promise(r => setTimeout(r, 400));
    flash.classList.remove('active');
    flash.style.display = 'none';

    // Stop audio after transition if user wants it quiet
    this.audio.stop();

    // Animate in the main website
    this.revealWorld();
  }

  // ─── PHASE 2: WORLD ───
  private initWorld() {
    const canvas = document.getElementById('world-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    this.world = new WorldScene(canvas);

    // Scroll tracking
    const scrollContent = document.getElementById('scroll-content')!;
    scrollContent.addEventListener('scroll', () => {
      const scrollTop = scrollContent.scrollTop;
      const scrollHeight = scrollContent.scrollHeight - scrollContent.clientHeight;
      const progress = scrollTop / scrollHeight;

      if (this.world) {
        this.world.updateScroll(progress);
      }

      // Update nav visibility and style
      const nav = document.getElementById('main-nav');
      if (nav) {
        nav.classList.add('visible'); // Always visible in world phase
        if (scrollTop > 50) {
          nav.classList.add('scrolled');
        } else {
          nav.classList.remove('scrolled');
        }
      }

      // Update active nav link
      this.updateActiveNav(scrollContent);

      // Trigger section animations
      this.checkVisibility(scrollContent);
    });

    // Nav link smooth scroll (including footer links)
    document.querySelectorAll('.nav-link, .footer-links a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = (link as HTMLElement).getAttribute('href')?.slice(1);
        if (targetId) {
          const target = document.getElementById(targetId);
          const scrollContent = document.getElementById('scroll-content');
          if (target && scrollContent) {
            const targetTop = target.offsetTop;
            scrollContent.scrollTo({
              top: targetTop,
              behavior: 'smooth'
            });
          }
        }
      });
    });

    // Top right contact link listener
    const navContact = document.getElementById('nav-contact-link');
    if (navContact) {
      navContact.addEventListener('click', () => {
        const target = document.getElementById('contact');
        const scrollContent = document.getElementById('scroll-content');
        if (target && scrollContent) {
          scrollContent.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
        }
      });
    }

    // Logo click (Scroll to Home)
    const logo = document.getElementById('nav-logo-btn');
    if (logo) {
      logo.addEventListener('click', () => {
        const scrollContent = document.getElementById('scroll-content');
        if (scrollContent) {
          scrollContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }

    // Card hover sounds
    document.querySelectorAll('.service-card, .portfolio-card, .testimonial-card, .team-member').forEach(card => {
      card.addEventListener('mouseenter', () => {
        this.audio.playHoverBlip();
      });
    });

    // 3D Mouse-tracking tilt for cards and team members
    this.setup3DTilt();

    // Contact form handling
    this.setupContactForm();
  }

  private revealWorld() {
    const scrollContent = document.getElementById('scroll-content')!;

    // Show nav quickly
    setTimeout(() => {
      const nav = document.getElementById('main-nav');
      if (nav) nav.classList.add('visible');
    }, 200);

    // Animate home section
    const badge = scrollContent.querySelector('.home-badge');
    const titleWords = scrollContent.querySelectorAll('.title-word');
    const subtitle = scrollContent.querySelector('.home-subtitle');
    const stats = scrollContent.querySelector('.home-stats');

    // Staggered reveal — faster timings
    setTimeout(() => {
      badge?.classList.add('visible');
    }, 100);

    titleWords.forEach((word, i) => {
      setTimeout(() => {
        word.classList.add('visible');
      }, 200 + i * 120);
    });

    setTimeout(() => {
      subtitle?.classList.add('visible');
    }, 550);

    setTimeout(() => {
      stats?.classList.add('visible');
      this.animateCounters();
    }, 700);

    // Set up scroll-triggered animations
    this.checkVisibility(scrollContent);
  }

  // ─── SCROLL VISIBILITY OBSERVER ───
  private checkVisibility(container: HTMLElement) {
    const rect = container.getBoundingClientRect();
    const viewportHeight = rect.height;

    // Service cards
    container.querySelectorAll('.service-card').forEach((card, i) => {
      const cardRect = card.getBoundingClientRect();
      const relativeTop = cardRect.top - rect.top;
      if (relativeTop < viewportHeight * 0.85 && relativeTop > -cardRect.height) {
        setTimeout(() => {
          card.classList.add('visible');
        }, i * 100);
      }
    });

    // Timeline items
    container.querySelectorAll('.timeline-item').forEach((item, i) => {
      const itemRect = item.getBoundingClientRect();
      const relativeTop = itemRect.top - rect.top;
      if (relativeTop < viewportHeight * 0.85) {
        setTimeout(() => {
          item.classList.add('visible');
        }, i * 150);
      }
    });

    // Team members
    container.querySelectorAll('.team-member').forEach((member, i) => {
      const memberRect = member.getBoundingClientRect();
      const relativeTop = memberRect.top - rect.top;
      if (relativeTop < viewportHeight * 0.85) {
        setTimeout(() => {
          member.classList.add('visible');
        }, i * 100);
      }
    });


    // Portfolio cards
    container.querySelectorAll('.portfolio-card').forEach((card, i) => {
      const cardRect = card.getBoundingClientRect();
      const relativeTop = cardRect.top - rect.top;
      if (relativeTop < viewportHeight * 0.9 && relativeTop > -cardRect.height) {
        setTimeout(() => {
          card.classList.add('visible');
        }, i * 80);
      }
    });

    // Testimonial cards
    container.querySelectorAll('.testimonial-card').forEach((card, i) => {
      const cardRect = card.getBoundingClientRect();
      const relativeTop = cardRect.top - rect.top;
      if (relativeTop < viewportHeight * 0.9 && relativeTop > -cardRect.height) {
        setTimeout(() => {
          card.classList.add('visible');
        }, i * 120);
      }
    });

    // CTA section
    const ctaSection = container.querySelector('.cta-content');
    if (ctaSection) {
      const ctaRect = ctaSection.getBoundingClientRect();
      const relativeTop = ctaRect.top - rect.top;
      if (relativeTop < viewportHeight * 0.85) {
        ctaSection.classList.add('visible');
      }
    }
  }

  private updateActiveNav(container: HTMLElement) {
    const sections = ['home', 'services', 'portfolio', 'about', 'testimonials', 'cta', 'contact'];
    const scrollTop = container.scrollTop + 200;

    let active = 'home';
    for (const id of sections) {
      const section = document.getElementById(id);
      if (section && section.offsetTop <= scrollTop) {
        active = id;
      }
    }

    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if ((link as HTMLElement).dataset.section === active) {
        link.classList.add('active');
      }
    });
  }

  private animateCounters() {
    document.querySelectorAll('.stat-number').forEach(el => {
      const target = parseInt((el as HTMLElement).dataset.target || '0');
      const duration = 2000;
      const start = performance.now();

      const update = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased).toString();
        if (progress < 1) requestAnimationFrame(update);
      };

      requestAnimationFrame(update);
    });
  }

  // ─── CONTACT FORM ───
  private setupContactForm() {
    const form = document.getElementById('contact-form') as HTMLFormElement;
    const success = document.getElementById('form-success');
    const submitBtn = document.getElementById('contact-submit');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Animate button
        if (submitBtn) {
          submitBtn.textContent = 'SENDING...';
          (submitBtn as HTMLButtonElement).disabled = true;
        }

        // Simulate send (replace with real API)
        setTimeout(() => {
          form.style.display = 'none';
          if (success) {
            success.classList.add('show');
          }
          this.audio.playHoverBlip();
        }, 1200);
      });
    }
  }

  // ─── 3D TILT EFFECTS ───
  private setup3DTilt() {
    const tiltElements = document.querySelectorAll('.service-card, .portfolio-card, .testimonial-card, .team-member, .stat-item');

    tiltElements.forEach(el => {
      const element = el as HTMLElement;
      let currentRotateX = 0;
      let currentRotateY = 0;
      let targetRotateX = 0;
      let targetRotateY = 0;
      let animId: number | null = null;

      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      const updateTilt = () => {
        currentRotateX = lerp(currentRotateX, targetRotateX, 0.08);
        currentRotateY = lerp(currentRotateY, targetRotateY, 0.08);

        const translateZ = element.classList.contains('service-card') ? 15 : 10;

        element.style.transform = `
          perspective(800px) 
          rotateX(${currentRotateX}deg) 
          rotateY(${currentRotateY}deg) 
          translateZ(${translateZ}px)
          scale(1.02)
        `;

        if (Math.abs(currentRotateX - targetRotateX) > 0.01 ||
          Math.abs(currentRotateY - targetRotateY) > 0.01) {
          animId = requestAnimationFrame(updateTilt);
        }
      };

      element.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const mouseX = e.clientX - centerX;
        const mouseY = e.clientY - centerY;

        const maxTilt = element.classList.contains('service-card') ? 6 : 8;
        targetRotateY = (mouseX / (rect.width / 2)) * maxTilt;
        targetRotateX = -(mouseY / (rect.height / 2)) * maxTilt;

        if (!animId) {
          animId = requestAnimationFrame(updateTilt);
        }
      });

      element.addEventListener('mouseleave', () => {
        targetRotateX = 0;
        targetRotateY = 0;

        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }

        // Smooth reset
        const resetAnim = () => {
          currentRotateX = lerp(currentRotateX, 0, 0.1);
          currentRotateY = lerp(currentRotateY, 0, 0.1);

          element.style.transform = `
            perspective(800px) 
            rotateX(${currentRotateX}deg) 
            rotateY(${currentRotateY}deg) 
            translateZ(0px)
            scale(1)
          `;

          if (Math.abs(currentRotateX) > 0.1 || Math.abs(currentRotateY) > 0.1) {
            requestAnimationFrame(resetAnim);
          } else {
            element.style.transform = '';
          }
        };

        requestAnimationFrame(resetAnim);
      });
    });

    // Parallax depth for section headers on scroll
    const scrollContent = document.getElementById('scroll-content');
    if (scrollContent) {
      scrollContent.addEventListener('scroll', () => {
        const headers = document.querySelectorAll('.section-header');
        headers.forEach(header => {
          const rect = header.getBoundingClientRect();
          const centerY = window.innerHeight / 2;
          const offset = (rect.top - centerY) / centerY;
          const translateZ = Math.max(0, 40 - Math.abs(offset) * 30);
          const rotateX = offset * -3;
          (header as HTMLElement).style.transform = `translateZ(${translateZ}px) rotateX(${rotateX}deg)`;
        });
      });
    }
  }

  // ─── AUDIO TOGGLE ───
  private setupAudioToggle() {
    const btn = document.getElementById('audio-toggle');
    if (btn) {
      btn.addEventListener('click', () => {
        this.audio.toggle();
      });
    }
  }
}

// ─── BOOT ───
document.addEventListener('DOMContentLoaded', () => {
  new GallantExperience();
});
