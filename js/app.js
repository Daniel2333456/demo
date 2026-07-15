"use strict";

(() => {
    const dramas = Array.isArray(window.DRAMAS) ? window.DRAMAS : [];

    const STORAGE = {
        favorites: "dreamReelFavorites",
        history: "dreamReelHistory",
        profile: "dreamReelProfile",
        membership: "dreamReelMembership",
        theme: "dreamReelTheme"
    };

    function readJson(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.warn(`Unable to read ${key} from localStorage.`, error);
            return fallback;
        }
    }

    function writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn(`Unable to write ${key} to localStorage.`, error);
        }
    }

    function getDrama(id) {
        return dramas.find((drama) => drama.id === Number(id));
    }

    function getFavorites() {
        return readJson(STORAGE.favorites, [])
            .map(Number)
            .filter(Number.isFinite);
    }

    function setFavorites(ids) {
        const uniqueIds = [...new Set(ids.map(Number).filter(Number.isFinite))];
        writeJson(STORAGE.favorites, uniqueIds);
    }

    function isFavorite(id) {
        return getFavorites().includes(Number(id));
    }

    function toggleFavorite(id) {
        const numericId = Number(id);
        const favorites = getFavorites();
        const index = favorites.indexOf(numericId);

        if (index >= 0) {
            favorites.splice(index, 1);
        } else {
            favorites.push(numericId);
        }

        setFavorites(favorites);
        return favorites.includes(numericId);
    }

    function getHistory() {
        return readJson(STORAGE.history, []);
    }

    function addHistory(dramaId, episode) {
        const current = getHistory().filter((entry) => {
            return !(
                Number(entry.dramaId) === Number(dramaId) &&
                Number(entry.episode) === Number(episode)
            );
        });

        current.unshift({
            dramaId: Number(dramaId),
            episode: Number(episode),
            viewedAt: new Date().toISOString()
        });

        writeJson(STORAGE.history, current.slice(0, 20));
    }

    function createDramaCard(drama) {
        const tags = drama.genres
            .slice(0, 2)
            .map((genre) => `<span class="tag">${genre}</span>`)
            .join("");

        const typeLabel =
            drama.type === "interactive" ? "Interactive" : "Short Drama";

        return `
            <a
                class="drama-card-link"
                href="player.html?id=${drama.id}&episode=1"
                aria-label="Watch ${drama.title}"
            >
                <article class="drama-card">
                    <div class="poster-wrapper">
                        <img src="${drama.poster}" alt="${drama.title}">
                        <span class="card-type-label">${typeLabel}</span>
                        <span class="episode-label">${drama.episodes.length} Episodes</span>
                    </div>

                    <div class="tags">${tags}</div>

                    <h3 class="drama-title">${drama.title}</h3>

                    <div class="card-meta">
                        <span>${drama.views} views</span>
                        <span>${isFavorite(drama.id) ? "♥ Saved" : "♡ Save"}</span>
                    </div>
                </article>
            </a>
        `;
    }

    function renderDramaCards(container, items, emptyMessage = "No dramas found.") {
        if (!container) {
            return;
        }

        if (!items.length) {
            container.innerHTML = `<div class="empty-card-message">${emptyMessage}</div>`;
            return;
        }

        container.innerHTML = items.map(createDramaCard).join("");
    }

    function normalize(value) {
        return String(value || "").trim().toLowerCase();
    }

    function applySavedTheme() {
        const theme = localStorage.getItem(STORAGE.theme) || "dark";
        document.body.classList.toggle("light-theme", theme === "light");
    }

    function setTheme(theme) {
        localStorage.setItem(STORAGE.theme, theme);
        document.body.classList.toggle("light-theme", theme === "light");
    }

    function initHome() {
        const grid = document.getElementById("homeGrid");
        const searchInput = document.getElementById("homeSearch");
        const tabs = [...document.querySelectorAll(".tab")];
        const sectionTitle = document.getElementById("homeSectionTitle");

        let selectedType = "short-drama";

        function refresh() {
            const keyword = normalize(searchInput?.value);

            const filtered = dramas.filter((drama) => {
                const searchableText = normalize([
                    drama.title,
                    drama.description,
                    ...drama.genres
                ].join(" "));

                return drama.type === selectedType && searchableText.includes(keyword);
            });

            sectionTitle.textContent =
                selectedType === "interactive" ? "Interactive Stories" : "Popular Now";

            renderDramaCards(
                grid,
                filtered,
                "No matching dramas were found in this category."
            );
        }

        searchInput?.addEventListener("input", refresh);

        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                selectedType = tab.dataset.type;

                tabs.forEach((item) => {
                    item.classList.toggle("active", item === tab);
                });

                refresh();
            });
        });

        const slides = [
            {
                title: "All Short Dramas",
                text: "Discover wonderful short dramas and enjoy them anytime, anywhere.",
                image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1400&q=85"
            },
            {
                title: "Stories Made for Mobile",
                text: "Watch vertical episodes designed for quick and immersive viewing.",
                image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=85"
            },
            {
                title: "Choose the Next Scene",
                text: "Explore interactive dramas where every decision changes the story.",
                image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1400&q=85"
            }
        ];

        const hero = document.getElementById("hero");
        const heroTitle = document.getElementById("heroTitle");
        const heroText = document.getElementById("heroText");
        const dots = [...document.querySelectorAll(".slider-dot")];

        function showSlide(index) {
            const slide = slides[index];

            if (!slide || !hero) {
                return;
            }

            heroTitle.textContent = slide.title;
            heroText.textContent = slide.text;
            hero.style.backgroundImage =
                `linear-gradient(to bottom, rgba(10, 10, 16, 0.12), rgba(10, 10, 16, 0.97)), url("${slide.image}")`;

            dots.forEach((dot, dotIndex) => {
                dot.classList.toggle("active", dotIndex === index);
            });
        }

        dots.forEach((dot) => {
            dot.addEventListener("click", () => {
                showSlide(Number(dot.dataset.slide));
            });
        });

        refresh();
    }

    function initDiscover() {
        const grid = document.getElementById("discoverGrid");
        const searchInput = document.getElementById("discoverSearch");
        const typeFilter = document.getElementById("typeFilter");
        const genreFilter = document.getElementById("genreFilter");
        const count = document.getElementById("discoverCount");

        const genres = [...new Set(dramas.flatMap((drama) => drama.genres))]
            .sort((a, b) => a.localeCompare(b));

        genres.forEach((genre) => {
            const option = document.createElement("option");
            option.value = genre;
            option.textContent = genre;
            genreFilter.appendChild(option);
        });

        function refresh() {
            const keyword = normalize(searchInput?.value);
            const selectedType = typeFilter?.value || "all";
            const selectedGenre = genreFilter?.value || "all";

            const filtered = dramas.filter((drama) => {
                const matchesKeyword = normalize([
                    drama.title,
                    drama.description,
                    ...drama.genres
                ].join(" ")).includes(keyword);

                const matchesType =
                    selectedType === "all" || drama.type === selectedType;

                const matchesGenre =
                    selectedGenre === "all" || drama.genres.includes(selectedGenre);

                return matchesKeyword && matchesType && matchesGenre;
            });

            count.textContent = `${filtered.length} result${filtered.length === 1 ? "" : "s"}`;
            renderDramaCards(grid, filtered);
        }

        searchInput?.addEventListener("input", refresh);
        typeFilter?.addEventListener("change", refresh);
        genreFilter?.addEventListener("change", refresh);

        refresh();
    }

    function initPlayer() {
        const parameters = new URLSearchParams(window.location.search);
        const dramaId = Number(parameters.get("id")) || 1;
        let episodeNumber = Number(parameters.get("episode")) || 1;

        const drama = getDrama(dramaId);

        const video = document.getElementById("videoPlayer");
        const headerTitle = document.getElementById("playerHeaderTitle");
        const title = document.getElementById("dramaTitle");
        const genres = document.getElementById("playerGenres");
        const episodeTitle = document.getElementById("episodeTitle");
        const description = document.getElementById("dramaDescription");
        const episodeCount = document.getElementById("episodeCount");
        const episodeList = document.getElementById("episodeList");
        const favoriteButton = document.getElementById("favoriteButton");
        const previousButton = document.getElementById("previousEpisode");
        const nextButton = document.getElementById("nextEpisode");
        const shareButton = document.getElementById("shareButton");
        const backButton = document.getElementById("backButton");

        backButton?.addEventListener("click", () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = "Home.html";
            }
        });

        if (!drama) {
            document.querySelector(".player-layout").innerHTML =
                `<div class="empty-card-message">Drama not found.</div>`;
            return;
        }

        function updateFavoriteButton() {
            const active = isFavorite(drama.id);
            favoriteButton.classList.toggle("active", active);
            favoriteButton.textContent = active ? "♥" : "♡";
            favoriteButton.setAttribute(
                "aria-label",
                active ? "Remove from favorites" : "Add to favorites"
            );
        }

        favoriteButton?.addEventListener("click", () => {
            toggleFavorite(drama.id);
            updateFavoriteButton();
        });

        function loadEpisode(number, shouldPlay = false) {
            const episode = drama.episodes.find((item) => item.number === number);

            if (!episode) {
                return;
            }

            episodeNumber = number;
            video.src = episode.video;
            video.poster = drama.poster;

            headerTitle.textContent = `${drama.title} · Episode ${episode.number}`;
            title.textContent = drama.title;
            genres.textContent = drama.genres.join(" · ");
            episodeTitle.textContent = `Episode ${episode.number}: ${episode.title}`;
            description.textContent = drama.description;
            episodeCount.textContent = `${drama.episodes.length} episodes`;

            [...episodeList.querySelectorAll(".episode-button")].forEach((button) => {
                button.classList.toggle(
                    "active",
                    Number(button.dataset.episode) === episode.number
                );
            });

            previousButton.disabled = episode.number === 1;
            nextButton.disabled = episode.number === drama.episodes.length;

            const newUrl =
                `player.html?id=${drama.id}&episode=${episode.number}`;

            window.history.replaceState({}, "", newUrl);
            addHistory(drama.id, episode.number);

            if (shouldPlay) {
                video.play().catch(() => {
                    // Browsers may block automatic playback.
                });
            }
        }

        drama.episodes.forEach((episode) => {
            const button = document.createElement("button");
            button.className = "episode-button";
            button.type = "button";
            button.dataset.episode = String(episode.number);
            button.textContent = String(episode.number);

            button.addEventListener("click", () => {
                loadEpisode(episode.number, true);
            });

            episodeList.appendChild(button);
        });

        previousButton?.addEventListener("click", () => {
            loadEpisode(episodeNumber - 1, true);
        });

        nextButton?.addEventListener("click", () => {
            loadEpisode(episodeNumber + 1, true);
        });

        video?.addEventListener("ended", () => {
            if (episodeNumber < drama.episodes.length) {
                loadEpisode(episodeNumber + 1, true);
            }
        });

        shareButton?.addEventListener("click", async () => {
            const url = window.location.href;

            try {
                if (navigator.share) {
                    await navigator.share({
                        title: drama.title,
                        text: `Watch ${drama.title} on Dream Reel.`,
                        url
                    });
                    return;
                }

                await navigator.clipboard.writeText(url);
                window.alert("The episode link has been copied.");
            } catch (error) {
                window.prompt("Copy this episode link:", url);
            }
        });

        const validEpisode = drama.episodes.some(
            (episode) => episode.number === episodeNumber
        );

        if (!validEpisode) {
            episodeNumber = 1;
        }

        updateFavoriteButton();
        loadEpisode(episodeNumber);
    }

    function initFavorites() {
        const grid = document.getElementById("favoritesGrid");
        const emptyState = document.getElementById("favoritesEmpty");
        const header = document.getElementById("favoritesHeader");
        const count = document.getElementById("favoritesCount");
        const clearButton = document.getElementById("clearFavoritesButton");

        function refresh() {
            const favoriteIds = getFavorites();
            const favoriteDramas = favoriteIds
                .map(getDrama)
                .filter(Boolean);

            const hasFavorites = favoriteDramas.length > 0;

            emptyState.classList.toggle("hidden", hasFavorites);
            header.classList.toggle("hidden", !hasFavorites);
            grid.classList.toggle("hidden", !hasFavorites);
            clearButton.classList.toggle("hidden", !hasFavorites);

            count.textContent =
                `${favoriteDramas.length} saved`;

            renderDramaCards(grid, favoriteDramas);
        }

        clearButton?.addEventListener("click", () => {
            const confirmed = window.confirm(
                "Remove all dramas from your favorites?"
            );

            if (!confirmed) {
                return;
            }

            setFavorites([]);
            refresh();
        });

        refresh();
    }

    function initProfile() {
        const avatar = document.getElementById("profileAvatar");
        const nameElement = document.getElementById("profileName");
        const emailElement = document.getElementById("profileEmail");
        const membershipBadge = document.getElementById("membershipBadge");
        const favoriteStat = document.getElementById("favoriteStat");
        const historyStat = document.getElementById("historyStat");
        const membershipStat = document.getElementById("membershipStat");
        const form = document.getElementById("profileForm");
        const nameInput = document.getElementById("profileNameInput");
        const emailInput = document.getElementById("profileEmailInput");
        const membershipButton = document.getElementById("membershipButton");
        const themeButton = document.getElementById("themeButton");
        const themeLabel = document.getElementById("themeLabel");
        const clearHistoryButton = document.getElementById("clearHistoryButton");
        const resetProfileButton = document.getElementById("resetProfileButton");
        const historyList = document.getElementById("historyList");

        function getProfile() {
            return readJson(STORAGE.profile, {
                name: "Guest User",
                email: ""
            });
        }

        function getMembership() {
            return localStorage.getItem(STORAGE.membership) || "Free";
        }

        function renderHistory() {
            const history = getHistory();

            if (!history.length) {
                historyList.innerHTML =
                    `<div class="history-empty">No watch history yet.</div>`;
                return;
            }

            historyList.innerHTML = history
                .map((entry) => {
                    const drama = getDrama(entry.dramaId);

                    if (!drama) {
                        return "";
                    }

                    const viewedDate = new Date(entry.viewedAt);
                    const timeLabel = Number.isNaN(viewedDate.getTime())
                        ? ""
                        : viewedDate.toLocaleDateString();

                    return `
                        <a
                            class="history-item"
                            href="player.html?id=${drama.id}&episode=${entry.episode}"
                        >
                            <img src="${drama.poster}" alt="${drama.title}">
                            <div>
                                <h3>${drama.title}</h3>
                                <p>Episode ${entry.episode}</p>
                            </div>
                            <time>${timeLabel}</time>
                        </a>
                    `;
                })
                .join("");
        }

        function renderProfile() {
            const profile = getProfile();
            const membership = getMembership();
            const favorites = getFavorites();
            const history = getHistory();

            const displayName = profile.name?.trim() || "Guest User";
            const email = profile.email?.trim();

            avatar.textContent = displayName.charAt(0).toUpperCase();
            nameElement.textContent = displayName;
            emailElement.textContent = email || "No email saved";
            membershipBadge.textContent = `${membership} member`;

            favoriteStat.textContent = String(favorites.length);
            historyStat.textContent = String(history.length);
            membershipStat.textContent = membership;

            nameInput.value = displayName === "Guest User" ? "" : displayName;
            emailInput.value = email || "";

            const currentTheme =
                localStorage.getItem(STORAGE.theme) || "dark";

            themeLabel.textContent =
                currentTheme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode";

            renderHistory();
        }

        form?.addEventListener("submit", (event) => {
            event.preventDefault();

            const name = nameInput.value.trim() || "Guest User";
            const email = emailInput.value.trim();

            writeJson(STORAGE.profile, { name, email });
            renderProfile();
            window.alert("The simulated profile has been saved locally.");
        });

        membershipButton?.addEventListener("click", () => {
            const nextMembership =
                getMembership() === "Premium" ? "Free" : "Premium";

            localStorage.setItem(STORAGE.membership, nextMembership);
            renderProfile();

            window.alert(
                `Membership changed to ${nextMembership}. This is only a front-end demo.`
            );
        });

        themeButton?.addEventListener("click", () => {
            const currentTheme =
                localStorage.getItem(STORAGE.theme) || "dark";

            setTheme(currentTheme === "dark" ? "light" : "dark");
            renderProfile();
        });

        clearHistoryButton?.addEventListener("click", () => {
            const confirmed = window.confirm("Clear all watch history?");

            if (!confirmed) {
                return;
            }

            writeJson(STORAGE.history, []);
            renderProfile();
        });

        resetProfileButton?.addEventListener("click", () => {
            const confirmed = window.confirm(
                "Reset the profile and membership to their default values?"
            );

            if (!confirmed) {
                return;
            }

            localStorage.removeItem(STORAGE.profile);
            localStorage.removeItem(STORAGE.membership);
            renderProfile();
        });

        renderProfile();
    }

    applySavedTheme();

    const page = document.body.dataset.page;

    const initializers = {
        home: initHome,
        discover: initDiscover,
        player: initPlayer,
        favorites: initFavorites,
        profile: initProfile
    };

    initializers[page]?.();
})();
