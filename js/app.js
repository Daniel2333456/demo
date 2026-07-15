"use strict";

(() => {
    const dramas = Array.isArray(window.DRAMAS) ? window.DRAMAS : [];
    const page = document.body.dataset.page;

    const KEYS = {
        favorites: "dreamDramaFavoritesV2",
        likes: "dreamDramaLikesV2",
        history: "dreamDramaHistoryV2",
        profile: "dreamDramaProfileV2",
        balance: "dreamDramaBalanceV2",
        unlocked: "dreamDramaUnlockedV2",
        recharge: "dreamDramaRechargeRecordsV2",
        consumption: "dreamDramaConsumptionRecordsV2",
        onboarding: "dreamDramaOnboardingDoneV2"
    };

    const coinPacks = [
        { coins: 50, price: "$0.99" },
        { coins: 120, price: "$1.99" },
        { coins: 250, price: "$3.99" },
        { coins: 600, price: "$7.99" }
    ];

    let toastTimer = null;

    function readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            console.warn(`Could not read ${key}`, error);
            return fallback;
        }
    }

    function writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn(`Could not write ${key}`, error);
        }
    }

    function getDrama(id) {
        return dramas.find((drama) => drama.id === Number(id));
    }

    function normalize(value) {
        return String(value || "").trim().toLowerCase();
    }

    function showToast(message) {
        const toast = document.getElementById("globalToast");
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
    }

    function getList(key) {
        return readJson(key, []).map(Number).filter(Number.isFinite);
    }

    function setList(key, ids) {
        writeJson(key, [...new Set(ids.map(Number).filter(Number.isFinite))]);
    }

    function listContains(key, id) {
        return getList(key).includes(Number(id));
    }

    function toggleListItem(key, id) {
        const numericId = Number(id);
        const ids = getList(key);
        const index = ids.indexOf(numericId);
        if (index >= 0) ids.splice(index, 1);
        else ids.push(numericId);
        setList(key, ids);
        return ids.includes(numericId);
    }

    function getProfile() {
        const stored = readJson(KEYS.profile, null);
        if (stored && stored.id) return stored;

        const guest = {
            name: "Guest User",
            email: "",
            id: `tourist${String(Math.floor(Math.random() * 90000) + 10000)}`
        };
        writeJson(KEYS.profile, guest);
        return guest;
    }

    function saveProfile(profile) {
        const existing = getProfile();
        writeJson(KEYS.profile, {
            name: profile.name?.trim() || "Guest User",
            email: profile.email?.trim() || "",
            id: existing.id || `tourist${Date.now().toString().slice(-5)}`
        });
    }

    function isLoggedIn() {
        return Boolean(getProfile().email);
    }

    function getBalance() {
        const value = Number(localStorage.getItem(KEYS.balance));
        return Number.isFinite(value) && value >= 0 ? value : 0;
    }

    function setBalance(value) {
        localStorage.setItem(KEYS.balance, String(Math.max(0, Number(value) || 0)));
    }

    function addRecord(key, record) {
        const records = readJson(key, []);
        records.unshift({ ...record, createdAt: new Date().toISOString() });
        writeJson(key, records.slice(0, 50));
    }

    function episodeKey(dramaId, episodeNumber) {
        return `${Number(dramaId)}:${Number(episodeNumber)}`;
    }

    function isEpisodeUnlocked(drama, episodeNumber) {
        if (Number(episodeNumber) <= Number(drama.freeEpisodes || 0)) return true;
        return readJson(KEYS.unlocked, []).includes(episodeKey(drama.id, episodeNumber));
    }

    function unlockEpisode(drama, episodeNumber) {
        const keys = readJson(KEYS.unlocked, []);
        const key = episodeKey(drama.id, episodeNumber);
        if (!keys.includes(key)) keys.push(key);
        writeJson(KEYS.unlocked, keys);
    }

    function addHistory(dramaId, episodeNumber) {
        const history = readJson(KEYS.history, []).filter((item) => {
            return !(Number(item.dramaId) === Number(dramaId) && Number(item.episode) === Number(episodeNumber));
        });
        history.unshift({ dramaId: Number(dramaId), episode: Number(episodeNumber), viewedAt: new Date().toISOString() });
        writeJson(KEYS.history, history.slice(0, 30));
    }

    function createPosterCard(drama) {
        const tags = drama.genres.slice(0, 2).map((genre) => `<span class="tag">${genre}</span>`).join("");
        const type = drama.type === "interactive" ? "Interactive" : "Short Drama";
        return `
            <a class="poster-link" href="player.html?id=${drama.id}&episode=1" aria-label="Watch ${drama.title}">
                <article>
                    <div class="poster-image">
                        <img src="${drama.poster}" alt="${drama.title}">
                        <span class="card-badge">${type}</span>
                        <span class="episode-count">${drama.episodes.length} Episodes</span>
                    </div>
                    <div class="tag-row">${tags}</div>
                    <h3>${drama.title}</h3>
                    <div class="card-footer"><span>${drama.views} views</span><span>${listContains(KEYS.favorites, drama.id) ? "★ Saved" : "☆ Save"}</span></div>
                </article>
            </a>`;
    }

    function renderPosterGrid(container, items, emptyMessage = "No dramas found.") {
        if (!container) return;
        container.innerHTML = items.length ? items.map(createPosterCard).join("") : `<div class="empty-inline">${emptyMessage}</div>`;
    }

    function openModal(id) {
        const element = document.getElementById(id);
        if (!element) return;
        element.classList.remove("hidden");
        element.setAttribute("aria-hidden", "false");
    }

    function closeModal(id) {
        const element = document.getElementById(id);
        if (!element) return;
        element.classList.add("hidden");
        element.setAttribute("aria-hidden", "true");
    }

    function bindGenericModalClosers() {
        document.querySelectorAll("[data-close-modal]").forEach((button) => {
            button.addEventListener("click", () => closeModal(button.dataset.closeModal));
        });
        document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
            backdrop.addEventListener("click", (event) => {
                if (event.target === backdrop) closeModal(backdrop.id);
            });
        });
    }

    function renderWallet(onPurchase) {
        const balanceTargets = document.querySelectorAll("#walletBalance, #profileBalance, #headerBalance");
        balanceTargets.forEach((target) => { target.textContent = String(getBalance()); });

        const grid = document.getElementById("coinPackGrid");
        if (!grid) return;
        grid.innerHTML = coinPacks.map((pack) => `
            <button class="coin-pack" type="button" data-coins="${pack.coins}" data-price="${pack.price}">
                <strong>${pack.coins} coins</strong>
                <span>${pack.price}</span>
            </button>`).join("");

        grid.querySelectorAll(".coin-pack").forEach((button) => {
            button.addEventListener("click", () => {
                const coins = Number(button.dataset.coins);
                const price = button.dataset.price;
                setBalance(getBalance() + coins);
                addRecord(KEYS.recharge, { title: `${coins} coin pack`, amount: `+${coins}`, note: `Simulated payment ${price}` });
                renderWallet(onPurchase);
                showToast(`${coins} coins added. This was a simulated payment.`);
                if (typeof onPurchase === "function") onPurchase();
            });
        });
    }

    function initHome() {
        const grid = document.getElementById("homeGrid");
        const input = document.getElementById("homeSearch");
        const tabs = [...document.querySelectorAll(".category-tab")];
        const listTitle = document.getElementById("homeListTitle");
        let selectedType = "short-drama";

        function refresh() {
            const keyword = normalize(input?.value);
            const filtered = dramas.filter((drama) => {
                const searchable = normalize([drama.title, drama.description, ...drama.genres].join(" "));
                return drama.type === selectedType && searchable.includes(keyword);
            });
            listTitle.textContent = selectedType === "interactive" ? "Interactive Stories" : "Popular Now";
            renderPosterGrid(grid, filtered, "No matching content in this category.");
        }

        input?.addEventListener("input", refresh);
        tabs.forEach((tab) => tab.addEventListener("click", () => {
            selectedType = tab.dataset.contentType;
            tabs.forEach((item) => item.classList.toggle("active", item === tab));
            refresh();
        }));

        const slides = [
            { title: "All Short Dramas", text: "Selected high-quality short dramas, enjoy exciting stories anytime, anywhere.", image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=85" },
            { title: "Watch One Episode at a Time", text: "Vertical episodes are designed for quick, immersive mobile viewing.", image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=85" },
            { title: "Choose the Story", text: "Interactive dramas let your decisions change the next scene.", image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=85" }
        ];
        const hero = document.getElementById("homeHero");
        const title = document.getElementById("heroTitle");
        const text = document.getElementById("heroText");
        const dots = document.getElementById("heroDots");
        let activeSlide = 0;

        slides.forEach((_, index) => {
            const button = document.createElement("button");
            button.className = `hero-dot${index === 0 ? " active" : ""}`;
            button.type = "button";
            button.addEventListener("click", () => showSlide(index));
            dots.appendChild(button);
        });

        function showSlide(index) {
            activeSlide = index;
            const slide = slides[index];
            title.textContent = slide.title;
            text.textContent = slide.text;
            hero.style.backgroundImage = `linear-gradient(to bottom, rgba(4,4,10,.2), rgba(13,13,21,.97)), url("${slide.image}")`;
            [...dots.children].forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex === index));
        }

        setInterval(() => showSlide((activeSlide + 1) % slides.length), 7000);
        refresh();
        initOnboarding();
    }

    function initOnboarding() {
        if (localStorage.getItem(KEYS.onboarding) === "done") return;
        const overlay = document.getElementById("onboarding");
        const next = document.getElementById("onboardingNext");
        const skip = document.getElementById("onboardingSkip");
        const count = document.getElementById("onboardingStepCount");
        const title = document.getElementById("onboardingTitle");
        const text = document.getElementById("onboardingText");
        const label = document.getElementById("onboardingPreviewLabel");
        if (!overlay) return;

        const steps = [
            { title: "Your account is at the top right", text: "Open Personal Center to view saved dramas, history, balance and account records.", label: "1. Open Personal Center" },
            { title: "Tap a poster to start watching", text: "Every poster and title opens the vertical video player.", label: "2. Tap a drama poster" },
            { title: "Use the bottom navigation", text: "Move between Home, Discover, Saved and Profile at any time.", label: "3. Use bottom navigation" }
        ];
        let index = 0;

        function render() {
            const step = steps[index];
            count.textContent = `${index + 1} / ${steps.length}`;
            title.textContent = step.title;
            text.textContent = step.text;
            label.textContent = step.label;
            next.textContent = index === steps.length - 1 ? "Start Exploring" : "Next Step";
        }

        function finish() {
            localStorage.setItem(KEYS.onboarding, "done");
            overlay.classList.add("hidden");
            overlay.setAttribute("aria-hidden", "true");
        }

        overlay.classList.remove("hidden");
        overlay.setAttribute("aria-hidden", "false");
        next.addEventListener("click", () => {
            if (index >= steps.length - 1) finish();
            else { index += 1; render(); }
        });
        skip.addEventListener("click", finish);
        render();
    }

    function initDiscover() {
        const grid = document.getElementById("discoverGrid");
        const search = document.getElementById("discoverSearch");
        const type = document.getElementById("typeFilter");
        const genre = document.getElementById("genreFilter");
        const count = document.getElementById("discoverCount");

        [...new Set(dramas.flatMap((drama) => drama.genres))].sort().forEach((item) => {
            const option = document.createElement("option");
            option.value = item;
            option.textContent = item;
            genre.appendChild(option);
        });

        function refresh() {
            const keyword = normalize(search.value);
            const filtered = dramas.filter((drama) => {
                const searchable = normalize([drama.title, drama.description, ...drama.genres].join(" "));
                return searchable.includes(keyword)
                    && (type.value === "all" || drama.type === type.value)
                    && (genre.value === "all" || drama.genres.includes(genre.value));
            });
            count.textContent = `${filtered.length} result${filtered.length === 1 ? "" : "s"}`;
            renderPosterGrid(grid, filtered);
        }

        [search, type, genre].forEach((element) => element.addEventListener(element.tagName === "INPUT" ? "input" : "change", refresh));
        refresh();
    }

    function initPlayer() {
        const params = new URLSearchParams(window.location.search);
        const drama = getDrama(Number(params.get("id")) || 1);
        let currentEpisode = Number(params.get("episode")) || 1;
        let pendingEpisode = null;
        let playbackSpeedIndex = 0;
        const speeds = [1, 1.25, 1.5, 2];

        if (!drama) { window.location.href = "Home.html"; return; }

        const video = document.getElementById("videoPlayer");
        const play = document.getElementById("centerPlay");
        const progress = document.getElementById("progressRange");
        const speed = document.getElementById("speedButton");
        const mute = document.getElementById("muteButton");
        const muteIcon = document.getElementById("muteIcon");
        const save = document.getElementById("saveButton");
        const saveIcon = document.getElementById("saveIcon");
        const like = document.getElementById("likeButton");
        const likeIcon = document.getElementById("likeIcon");
        const title = document.getElementById("videoTitle");
        const tags = document.getElementById("videoTags");
        const episodeTitle = document.getElementById("videoEpisodeTitle");
        const topLabel = document.getElementById("topEpisodeLabel");
        const railLabel = document.getElementById("episodeRailLabel");
        const summaryText = document.getElementById("episodeSummaryText");
        const episodeGrid = document.getElementById("episodeGrid");
        const sheetTitle = document.getElementById("sheetDramaTitle");
        const unlockCost = document.getElementById("unlockCost");

        function updateActionStates() {
            const saved = listContains(KEYS.favorites, drama.id);
            const liked = listContains(KEYS.likes, drama.id);
            save.classList.toggle("active", saved);
            like.classList.toggle("active", liked);
            saveIcon.textContent = saved ? "★" : "☆";
            likeIcon.textContent = liked ? "♥" : "♡";
        }

        function updateEpisodeGrid() {
            episodeGrid.innerHTML = drama.episodes.map((episode) => {
                const locked = !isEpisodeUnlocked(drama, episode.number);
                return `<button class="episode-tile${episode.number === currentEpisode ? " active" : ""}${locked ? " locked" : ""}" data-episode="${episode.number}" type="button">${episode.number}</button>`;
            }).join("");
            episodeGrid.querySelectorAll(".episode-tile").forEach((button) => button.addEventListener("click", () => requestEpisode(Number(button.dataset.episode), true)));
        }

        function requestEpisode(number, autoPlay = false) {
            const episode = drama.episodes.find((item) => item.number === number);
            if (!episode) return;
            if (!isEpisodeUnlocked(drama, number)) {
                pendingEpisode = number;
                unlockCost.textContent = String(drama.unlockCost);
                closeSheet("episodeSheet");
                openModal("unlockModal");
                return;
            }
            loadEpisode(number, autoPlay);
        }

        function loadEpisode(number, autoPlay = false) {
            const episode = drama.episodes.find((item) => item.number === number);
            if (!episode) return;
            currentEpisode = number;
            video.src = episode.video;
            video.poster = drama.poster;
            title.textContent = drama.title;
            tags.innerHTML = drama.genres.map((tag) => `<span>${tag}</span>`).join("");
            episodeTitle.textContent = `Episode ${episode.number}: ${episode.title}`;
            topLabel.textContent = `Episode ${episode.number}`;
            railLabel.textContent = `Ep.${episode.number}`;
            summaryText.textContent = `Episode ${episode.number} of ${drama.episodes.length}`;
            sheetTitle.textContent = drama.title;
            document.title = `${drama.title} - Episode ${episode.number}`;
            progress.value = "0";
            play.classList.remove("hidden");
            addHistory(drama.id, episode.number);
            updateEpisodeGrid();
            window.history.replaceState({}, "", `player.html?id=${drama.id}&episode=${episode.number}`);
            if (autoPlay) video.play().catch(() => {});
        }

        function openSheet(id) {
            document.getElementById("episodeSheetBackdrop")?.classList.remove("hidden");
            const sheet = document.getElementById(id);
            sheet?.classList.remove("hidden");
            sheet?.setAttribute("aria-hidden", "false");
        }

        function closeSheet(id) {
            document.getElementById(id)?.classList.add("hidden");
            document.getElementById(id)?.setAttribute("aria-hidden", "true");
            const anyOpen = ["episodeSheet", "moreSheet"].some((sheetId) => !document.getElementById(sheetId)?.classList.contains("hidden"));
            if (!anyOpen) document.getElementById("episodeSheetBackdrop")?.classList.add("hidden");
        }

        document.getElementById("playerBack")?.addEventListener("click", () => window.history.length > 1 ? window.history.back() : window.location.assign("Home.html"));
        document.getElementById("episodeDrawerButton")?.addEventListener("click", () => openSheet("episodeSheet"));
        document.getElementById("episodeSummaryButton")?.addEventListener("click", () => openSheet("episodeSheet"));
        document.getElementById("closeEpisodeSheet")?.addEventListener("click", () => closeSheet("episodeSheet"));
        document.getElementById("moreButton")?.addEventListener("click", () => openSheet("moreSheet"));
        document.getElementById("closeMoreSheet")?.addEventListener("click", () => closeSheet("moreSheet"));
        document.getElementById("episodeSheetBackdrop")?.addEventListener("click", () => { closeSheet("episodeSheet"); closeSheet("moreSheet"); });

        function togglePlayback() {
            if (video.paused) video.play().catch(() => {});
            else video.pause();
        }
        play.addEventListener("click", togglePlayback);
        video.addEventListener("click", togglePlayback);
        video.addEventListener("play", () => play.classList.add("hidden"));
        video.addEventListener("pause", () => play.classList.remove("hidden"));
        video.addEventListener("timeupdate", () => {
            if (Number.isFinite(video.duration) && video.duration > 0) progress.value = String((video.currentTime / video.duration) * 100);
        });
        video.addEventListener("ended", () => {
            if (currentEpisode < drama.episodes.length) requestEpisode(currentEpisode + 1, true);
        });
        progress.addEventListener("input", () => {
            if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = (Number(progress.value) / 100) * video.duration;
        });

        mute.addEventListener("click", () => {
            video.muted = !video.muted;
            muteIcon.textContent = video.muted ? "🔇" : "🔊";
        });
        speed.addEventListener("click", () => {
            playbackSpeedIndex = (playbackSpeedIndex + 1) % speeds.length;
            video.playbackRate = speeds[playbackSpeedIndex];
            speed.textContent = `${speeds[playbackSpeedIndex]}×`;
        });
        save.addEventListener("click", () => { const active = toggleListItem(KEYS.favorites, drama.id); updateActionStates(); showToast(active ? "Saved to your library." : "Removed from saved dramas."); });
        like.addEventListener("click", () => { const active = toggleListItem(KEYS.likes, drama.id); updateActionStates(); showToast(active ? "You liked this drama." : "Like removed."); });

        document.getElementById("openWalletButton")?.addEventListener("click", () => { renderWallet(); openModal("walletModal"); });
        document.getElementById("unlockNowButton")?.addEventListener("click", () => {
            if (!pendingEpisode) return;
            if (!isLoggedIn()) { closeModal("unlockModal"); openModal("loginModal"); return; }
            const cost = Number(drama.unlockCost || 10);
            if (getBalance() < cost) { closeModal("unlockModal"); renderWallet(); openModal("walletModal"); showToast("Not enough coins. Choose a simulated coin pack."); return; }
            setBalance(getBalance() - cost);
            unlockEpisode(drama, pendingEpisode);
            addRecord(KEYS.consumption, { title: `${drama.title} · Episode ${pendingEpisode}`, amount: `-${cost}`, note: "Episode unlock" });
            const target = pendingEpisode;
            pendingEpisode = null;
            closeModal("unlockModal");
            showToast("Episode unlocked.");
            loadEpisode(target, true);
        });
        document.getElementById("loginFromUnlock")?.addEventListener("click", () => { closeModal("unlockModal"); openModal("loginModal"); });
        document.getElementById("loginForm")?.addEventListener("submit", (event) => {
            event.preventDefault();
            saveProfile({ name: document.getElementById("loginName").value, email: document.getElementById("loginEmail").value });
            closeModal("loginModal");
            showToast("Email linked in this browser.");
            if (pendingEpisode) openModal("unlockModal");
        });

        async function shareCurrent() {
            const url = window.location.href;
            try {
                if (navigator.share) await navigator.share({ title: drama.title, text: `Watch ${drama.title}`, url });
                else if (navigator.clipboard) { await navigator.clipboard.writeText(url); showToast("Episode link copied."); }
                else window.prompt("Copy this link:", url);
            } catch (_) {}
        }
        document.getElementById("shareEpisodeButton")?.addEventListener("click", shareCurrent);
        document.getElementById("copyLinkButton")?.addEventListener("click", async () => { try { await navigator.clipboard.writeText(window.location.href); showToast("Episode link copied."); } catch (_) { window.prompt("Copy this link:", window.location.href); } });
        document.getElementById("reportButton")?.addEventListener("click", () => { closeSheet("moreSheet"); showToast("Report submitted in this demo."); });

        renderWallet(() => {
            if (pendingEpisode && getBalance() >= Number(drama.unlockCost || 10)) {
                closeModal("walletModal");
                openModal("unlockModal");
            }
        });
        updateActionStates();
        requestEpisode(currentEpisode, false);
    }

    function initProfile() {
        const profile = getProfile();
        document.getElementById("profileAvatar").textContent = (profile.name || "G").charAt(0).toUpperCase();
        document.getElementById("profileName").textContent = profile.name || "Guest User";
        document.getElementById("profileId").textContent = profile.email || profile.id;
        renderWallet();

        const modalTitle = document.getElementById("profileModalTitle");
        const modalText = document.getElementById("profileModalText");
        const modalKicker = document.getElementById("profileModalKicker");
        const nameLabel = document.getElementById("profileNameLabel");
        const emailLabel = document.getElementById("profileEmailLabel");
        const messageLabel = document.getElementById("profileMessageLabel");
        const nameInput = document.getElementById("profileModalName");
        const emailInput = document.getElementById("profileModalEmail");
        const messageInput = document.getElementById("profileModalMessage");
        const submit = document.getElementById("profileModalSubmit");
        let action = "link-email";

        function configureModal(nextAction) {
            action = nextAction;
            const isAccount = action === "link-email";
            nameLabel.classList.toggle("hidden", !isAccount);
            emailLabel.classList.toggle("hidden", !isAccount);
            messageLabel.classList.toggle("hidden", isAccount);
            if (isAccount) {
                modalKicker.textContent = "ACCOUNT DEMO";
                modalTitle.textContent = "Link an email";
                modalText.textContent = "The profile is saved only in this browser.";
                nameInput.value = profile.name === "Guest User" ? "" : profile.name;
                emailInput.value = profile.email || "";
                submit.textContent = "Save profile";
            } else {
                modalKicker.textContent = action === "feedback" ? "FEEDBACK" : "CONTACT";
                modalTitle.textContent = action === "feedback" ? "Send feedback" : "Contact Us";
                modalText.textContent = action === "feedback" ? "Tell us what could be improved." : "Leave a message for the Dream Drama team.";
                messageInput.value = "";
                submit.textContent = "Submit message";
            }
            openModal("profileModal");
        }

        document.querySelectorAll("[data-profile-action]").forEach((button) => button.addEventListener("click", () => configureModal(button.dataset.profileAction)));
        document.getElementById("profileModalForm")?.addEventListener("submit", (event) => {
            event.preventDefault();
            if (action === "link-email") {
                saveProfile({ name: nameInput.value, email: emailInput.value });
                const updated = getProfile();
                document.getElementById("profileAvatar").textContent = updated.name.charAt(0).toUpperCase();
                document.getElementById("profileName").textContent = updated.name;
                document.getElementById("profileId").textContent = updated.email || updated.id;
                showToast("Profile saved locally.");
            } else {
                showToast(action === "feedback" ? "Feedback submitted in this demo." : "Message submitted in this demo.");
            }
            closeModal("profileModal");
        });
        ["profileShopButton", "balanceCard"].forEach((id) => document.getElementById(id)?.addEventListener("click", () => { renderWallet(); openModal("walletModal"); }));
    }

    function initCollection() {
        const mode = document.body.dataset.collection;
        const key = mode === "likes" ? KEYS.likes : KEYS.favorites;
        const grid = document.getElementById("collectionGrid");
        const empty = document.getElementById("collectionEmpty");
        const heading = document.getElementById("collectionHeading");
        const count = document.getElementById("collectionCount");
        const clear = document.getElementById("clearCollection");

        function refresh() {
            const items = getList(key).map(getDrama).filter(Boolean);
            const hasItems = items.length > 0;
            empty.classList.toggle("hidden", hasItems);
            heading.classList.toggle("hidden", !hasItems);
            grid.classList.toggle("hidden", !hasItems);
            clear.classList.toggle("hidden", !hasItems);
            count.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
            renderPosterGrid(grid, items);
        }
        clear.addEventListener("click", () => {
            if (!window.confirm(`Clear all ${mode === "likes" ? "liked" : "saved"} dramas?`)) return;
            setList(key, []);
            refresh();
        });
        refresh();
    }

    function initHistory() {
        const feed = document.getElementById("historyFeed");
        const empty = document.getElementById("historyEmpty");
        const clear = document.getElementById("clearHistory");
        function refresh() {
            const history = readJson(KEYS.history, []);
            empty.classList.toggle("hidden", history.length > 0);
            clear.classList.toggle("hidden", history.length === 0);
            feed.innerHTML = history.map((entry) => {
                const drama = getDrama(entry.dramaId);
                if (!drama) return "";
                const episode = drama.episodes.find((item) => item.number === Number(entry.episode));
                const date = new Date(entry.viewedAt);
                return `<a class="history-card" href="player.html?id=${drama.id}&episode=${entry.episode}"><img src="${drama.poster}" alt="${drama.title}"><div><h2>${drama.title}</h2><p>Episode ${entry.episode}${episode ? ` · ${episode.title}` : ""}</p><time>${Number.isNaN(date.getTime()) ? "" : date.toLocaleString()}</time></div></a>`;
            }).join("");
        }
        clear.addEventListener("click", () => {
            if (!window.confirm("Clear all watch history?")) return;
            writeJson(KEYS.history, []);
            refresh();
        });
        refresh();
    }

    function initRecords() {
        const tabs = [...document.querySelectorAll("[data-record-tab]")];
        const list = document.getElementById("recordList");
        const empty = document.getElementById("recordsEmpty");
        const params = new URLSearchParams(window.location.search);
        let active = params.get("tab") === "consumption" ? "consumption" : "recharge";

        function refresh() {
            tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.recordTab === active));
            const key = active === "recharge" ? KEYS.recharge : KEYS.consumption;
            const records = readJson(key, []);
            empty.classList.toggle("hidden", records.length > 0);
            list.innerHTML = records.map((record) => {
                const date = new Date(record.createdAt);
                return `<article class="record-item"><span class="record-symbol">${active === "recharge" ? "+" : "−"}</span><div><h3>${record.title}</h3><p>${record.note || ""}</p></div><div class="record-amount"><strong>${record.amount}</strong><time>${Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString()}</time></div></article>`;
            }).join("");
            window.history.replaceState({}, "", `records.html?tab=${active}`);
        }
        tabs.forEach((tab) => tab.addEventListener("click", () => { active = tab.dataset.recordTab; refresh(); }));
        refresh();
    }

    bindGenericModalClosers();
    const initializers = { home: initHome, discover: initDiscover, player: initPlayer, profile: initProfile, collection: initCollection, history: initHistory, records: initRecords };
    initializers[page]?.();
})();