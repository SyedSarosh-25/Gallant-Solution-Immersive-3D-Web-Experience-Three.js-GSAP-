# Gallant Solutions — Enter the New World 🌐

**Gallant Solutions** is a cutting-edge immersive digital agency website that serves as a portal to a new digital reality. This project showcases high-end web development techniques, blending 3D visuals, interactive design, and smooth animations to represent a company at the intersection of VR, AI, Game Development, and Design.

## 🚀 Project Overview

This repository contains the source code for the Gallant Solutions corporate website. It is built as a single-page application (SPA) focused on delivering a premium, "wow-factor" user experience. The site features a dual-phase interface:
1.  **The Portal:** An initial immersive entry point.
2.  **The World:** A rich, scrolling narrative revealing the company's services, portfolio, and vision.

## 🛠️ Tech Stack

-   **Frontend Framework:** Vanilla TypeScript with HTML5 & CSS3.
-   **Build Tool:** [Vite](https://vitejs.dev/) for fast development and optimized production builds.
-   **3D Graphics:** [Three.js](https://threejs.org/) for rendering the portal and background environments.
-   **Animations:** [GSAP (GreenSock Animation Platform)](https://greensock.com/) for high-performance UI animations and scroll effects.
-   **Styling:** Custom CSS with modern features (Variables, Flexbox, Grid, Glassmorphism).
-   **Fonts:** Orbitron, Rajdhani, and Inter via Google Fonts.

## ✨ Key Features

-   **Immersive Portal Entry:** A 3D canvas entry screen that sets the tone for the experience.
-   **Dynamic Navigation:** Smooth scrolling with active state highlighting and a call-to-action button.
-   **Interactive Services Section:** Detailed breakdown of 5 core divisions (VR/AI, Game Dev, 3D ArchViz, Design, Animation) with holographic styling.
-   **Portfolio Showcase:** A grid layout displaying selected high-impact projects with hover effects.
-   **Timeline & Team:** An "About Us" section featuring a company timeline and team member profiles.
-   **Contact Interface:** A functional-looking contact form with validation styling.
-   **Responsive Design:** Fully optimized for desktops, tablets, and mobile devices.

## 📂 Project Structure

```
Client-2/
├── public/              # Static assets
├── src/
│   ├── main.ts          # Application entry point & logic
│   ├── world.ts         # Three.js world/scene logic
│   ├── portal.ts        # Portal scene logic
│   ├── audio.ts         # Audio management
│   ├── style.css        # Global styles and themes
│   └── vite-env.d.ts    # TypeScript definitions
├── index.html           # Main HTML structure
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── .gitignore           # Git ignore rules
```

## 🔧 Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd Client-2
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open your browser and navigate to the local URL provided (usually `http://localhost:5173`).

4.  **Build for production:**
    ```bash
    npm run build
    ```

## 🎨 Design Philosophy

The design language emphasizes a futuristic, high-tech aesthetic ("Cyber-Corporate"). Key elements include:
-   **Dark Mode Default:** Deep blues and blacks (`#0a0a1a`) to reduce eye strain and make content pop.
-   **Neon Accents:** Strategic use of cyan, purple, and electric blue for focus points.
-   **Glassmorphism:** Translucent UI elements to maintain context with the 3D background.
-   **Micro-interactions:** Subtle glows, scales, and transitions on user interaction.

## 📝 License

This project is proprietary to Gallant Solutions. All rights reserved.
