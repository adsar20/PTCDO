// =========================
// SIDEBAR TOGGLE
// =========================

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebarToggleTopbar = document.getElementById("sidebarToggleTopbar");

    // Accept either legacy inline toggle (inside sidebar-header) OR unbranded topbar toggle
    const toggleButton = sidebarToggleTopbar || sidebarToggle;

    if (sidebar && toggleButton) {
        // Restore sidebar compact state from localStorage
        const savedCompact = localStorage.getItem('sidebarCompact');
        if (savedCompact === 'true') {
            sidebar.classList.add('compact');
            document.body.classList.add('sidebar-compact');
        }

        toggleButton.addEventListener("click", (e) => {
            e.stopPropagation();

            const icon = toggleButton.querySelector('i');
            
            if (window.innerWidth <= 768) {
                // Mobile / Tablet: slide-in open / close
                sidebar.classList.toggle("open");
                if (icon) {
                    icon.className = sidebar.classList.contains("open")
                        ? 'bi bi-x-lg'
                        : 'bi bi-list';
                }
                toggleButton.classList.toggle(
                    "hidden-when-open",
                    sidebar.classList.contains("open")
                );
            } else {
                // Desktop: compact mini-sidebar toggle
                const willBeCompact = !sidebar.classList.contains('compact');
                sidebar.classList.toggle("compact");
                // Remove open class if present from mobile
                sidebar.classList.remove("open");
                // Update body margin for compact state
                document.body.classList.toggle("sidebar-compact", willBeCompact);
                // Save to localStorage
                localStorage.setItem('sidebarCompact', willBeCompact);
                // Rotate icon for visual feedback
                if (icon) {
                    icon.style.transform = willBeCompact ? 'rotate(180deg)' : 'rotate(0deg)';
                }
            }
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener("click", (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !toggleButton.contains(e.target) && sidebar.classList.contains("open")) {
                    sidebar.classList.remove("open");

                    // Reset icon
                    const icon = toggleButton.querySelector('i');
                    if (icon) {
                        icon.className = 'bi bi-list';
                    }
                }
            }
        });

        // Handle window resize - reset sidebar state appropriately
        window.addEventListener("resize", () => {
            const icon = toggleButton.querySelector('i');

            if (window.innerWidth > 768) {
                sidebar.classList.remove("open");
                // Reset icon on desktop
                if (icon) {
                    icon.className = 'bi bi-list';
                    icon.style.transform = 'rotate(0deg)';
                }
                // Keep compact state on desktop if it was set
            } else {
                sidebar.classList.remove("compact");
                document.body.classList.remove("sidebar-compact");
                localStorage.setItem('sidebarCompact', 'false');
                // Reset icon on mobile
                if (icon) {
                    icon.className = 'bi bi-list';
                }
            }
        });
    }

    // =========================
    // DARK MODE
    // =========================

    const sidebarThemeToggle = document.getElementById("sidebarThemeToggle");

    // Function to apply theme
    const applyTheme = (isDark) => {
        if (isDark) {
            document.body.classList.add("dark");
        } else {
            document.body.classList.remove("dark");
        }
        // Sync toggle
        if (sidebarThemeToggle) {
            sidebarThemeToggle.checked = isDark;
        }
        localStorage.setItem("theme", isDark ? "dark" : "light");
    };

    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    applyTheme(isDark);

    // Sidebar theme toggle event listener
    if (sidebarThemeToggle) {
        sidebarThemeToggle.addEventListener("change", () => {
            applyTheme(sidebarThemeToggle.checked);
        });
    }
});