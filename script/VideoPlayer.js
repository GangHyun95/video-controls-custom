class VideoPlayer {
	#VIDEO_STATE = {};
	#ELEMENTS = {};
	#SCROLL_POS = 0;
	
	constructor(selector) {
		const target = document.querySelector(selector);
		this.#ELEMENTS.container = target;
		this.#VIDEO_STATE = {
			totalDuration: 0,
			pausedAt: 0,
			playbackRate: 1.0,
			volume: 0.5,
			rangeColor: null,
			convertTime: 0,
			isPaused: true,
			isDragging: false,
		};

		this.#ELEMENTS = {
			wrapper: target.querySelector(".video-player-wrapper"),
			playPauseBtn: target.querySelector(".play-pause-btn"),
			progressContainer: target.querySelector(".progress-section"),
			progressBar: target.querySelector(".progress-bar"),
            totalTimeText: target.querySelector(".total-time"),
            currentTimeText: target.querySelector(".current-time"),
			video: target.querySelector(".video-player"),
			volumeBtn: target.querySelector(".volume-btn"),
			volumeRange: target.querySelector(".volume-control"),
			fullScreenBtn: target.querySelector(".fs-btn"),
			pipBtn: target.querySelector(".pip-btn"),
			settingsBtn: target.querySelector(".settings-btn"),
			...this.#ELEMENTS,
		};

		if (this.#ELEMENTS.volumeRange) {
			this.updateSliderBackground();
		}

		if (this.isMobile()) {
			this.#ELEMENTS.volumeRange.classList.add("is-hidden");
		} else {
			this.#ELEMENTS.volumeRange.classList.remove("is-hidden");
		}
		
		if (navigator.userAgent.includes("Firefox")) {
			this.#ELEMENTS.pipBtn.classList.add("is-hidden");
		} else {
			this.#ELEMENTS.pipBtn.classList.remove("is-hidden");
		}

		this.init();
	}

	isMobile() {
		return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
	}

	updateSliderBackground() {
        const { volumeRange } = this.#ELEMENTS;
        if (volumeRange) {
            const percentage = volumeRange.value * 100;
            volumeRange.style.background = `linear-gradient(to right, #fff ${percentage}%, #555 ${percentage}%)`;
        }
    }

	init() {
		this.#ELEMENTS.video.addEventListener("loadedmetadata", (e) => {
			this.#ELEMENTS.totalTimeText.textContent = this.formatTime(e.target.duration);
			this.#VIDEO_STATE.totalDuration = e.target.duration;
		});
		this.registerEvent();
	}

	registerEvent() {
		const { container, wrapper, video, playPauseBtn, progressContainer, volumeBtn, volumeRange, fullScreenBtn, pipBtn, settingsBtn } = this.#ELEMENTS;
		
		const onPointerDown = (e) => {
			e.preventDefault();
			this.#VIDEO_STATE.isPaused = video.paused;
			video.pause();
			this.#VIDEO_STATE.isDragging = true;
			this.updateProgressFromEvent(e.touches ? e.touches[0] : e);
		};

		const onPointerMove = (e) => {
			if (!this.#VIDEO_STATE.isDragging) return false;
			e.preventDefault();
			this.updateProgressFromEvent(e.touches ? e.touches[0] : e);
		};

		const onPointerUp = (e) => {
			if (this.#VIDEO_STATE.isDragging) {
				this.#VIDEO_STATE.isDragging = false;
				const { left, width } = progressContainer.getBoundingClientRect();
				const event = e.type === 'touchend' ? e.changedTouches[0] : e;
				const x = event.clientX - left;
				const ratio = x / width;
				const newTime = Math.min(Math.max(0, ratio * this.#VIDEO_STATE.totalDuration), this.#VIDEO_STATE.totalDuration);
				this.updateProgressBarTo(newTime);
				video.currentTime = newTime;
			}
		};

		video.addEventListener("timeupdate", (e) => {
			this.updateProgressBar();
		});
		
		video.addEventListener("play", (e) => {
			playPauseBtn.classList.add("pause");
		});
		
		video.addEventListener("pause", (e) => {
			playPauseBtn.classList.remove("pause");
		});

		video.addEventListener('volumechange', (e) => {
			if (video.muted) {
				volumeBtn.classList.add("mute");
			} else {
				volumeBtn.classList.remove("mute");
			}
		});
		
		video.addEventListener("seeking", () => {
			if (!this.#VIDEO_STATE.isDragging) {
				this.showLoadingSpinner(true);
			} 
		});

		video.addEventListener("seeked", () => {
			this.showLoadingSpinner(false);
			if (!this.#VIDEO_STATE.isDragging && !this.#VIDEO_STATE.isPaused) {
				video.play();
			}
		});

		progressContainer.addEventListener("mousedown", onPointerDown);
		window.addEventListener("mousemove", onPointerMove);
		window.addEventListener("mouseup", onPointerUp);
	
		progressContainer.addEventListener("touchstart", onPointerDown, { passive: false });
		window.addEventListener("touchmove", onPointerMove, { passive: false });
		window.addEventListener("touchend", onPointerUp, { passive: false });

		video.addEventListener("click", (e) => {
			e.preventDefault();
			video.paused ? video.play() : video.pause();
		});
		
		playPauseBtn.onclick = () => video.paused ? video.play() : video.pause();

		volumeBtn?.addEventListener("click", () => {
            video.muted = !video.muted;
            if (volumeRange) {
				volumeRange.value = video.muted ? 0 : this.#VIDEO_STATE.volume;
            	this.updateSliderBackground();
			}
		});

        volumeRange?.addEventListener("input", (e) => {
			this.#VIDEO_STATE.volume = parseFloat(e.target.value);
            video.volume = this.#VIDEO_STATE.volume;
			video.muted = e.target.value <= 0;

            this.updateSliderBackground();
        });

		pipBtn?.addEventListener("click", () => {
            if (document.pictureInPictureEnabled && video !== document.pictureInPictureElement) {
				video.requestPictureInPicture();
			} else {
				document.exitPictureInPicture();
			}
		});

		fullScreenBtn.addEventListener("click", (e) => this.toggleFullscreen());
		video.addEventListener("dblclick", () => this.toggleFullscreen());

		this.#ELEMENTS.container.addEventListener("fullscreenchange", (e) => {
			if (document.fullscreenElement) {
				wrapper.classList.add("full-screen");
				
			} else {
				window.scrollTo(0, this.#SCROLL_POS);
				if (video.currentTime > 0) this.updateProgressBarTo(video.currentTime);
				wrapper.classList.remove("full-screen");
			}
		});

		let settingsActive = false;
		const settingsContainer = container.querySelector(".settings-container");
		const settingsPanels = container.querySelector(".settings-panels");
		const playbackSettings = container.querySelector(".playback-settings");

		settingsBtn.addEventListener("click", (e) => {
			e.stopPropagation();

			if (!settingsActive) {
				settingsContainer.classList.remove("is-hidden");
				settingsActive = true;
			} else {
				settingsContainer.classList.add("is-hidden");
				settingsActive = false;
			}
		});

		window.addEventListener("click", (e) => {
			if (!settingsContainer.contains(e.target) && settingsActive) {
				settingsContainer.classList.add("is-hidden");
				playbackSettings.classList.add("is-hidden");
				settingsPanels.classList.remove("is-hidden");
				settingsActive = false;
			}
		});

		container.querySelector(".playback-rate-panel").addEventListener("click", (e) => {
			e.stopPropagation();
			settingsPanels.classList.add("is-hidden");
			playbackSettings.classList.remove("is-hidden");
		});

		playbackSettings.addEventListener("click", (e) => {
			const target = e.target.closest("li[data-playback-rate]");
			
			if (target) {
				const value = target.getAttribute("data-playback-rate");
				if (value) {
					this.#VIDEO_STATE.playbackRate = parseFloat(value);
					video.playbackRate = parseFloat(value);
					container.querySelector(".playback-text").textContent = target.textContent;
				}
			}
		
			playbackSettings.classList.add("is-hidden");
			settingsPanels.classList.remove("is-hidden");
		});
		

		video.addEventListener("keydown", (e) => {
			if (["ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
				e.preventDefault();
				switch (e.code) {
					case "ArrowLeft": {
						video.currentTime -= 5;
						break;
					}
					case "ArrowRight": {
						video.currentTime += 5;
						break;
					}
					case "Space": {
						playPauseBtn.click();
						break;
					}
				}
				this.updateProgressBarTo(video.currentTime);
			}
		});
	}

	showLoadingSpinner(visible) {
		const spinner = this.#ELEMENTS.container.querySelector(".video-player-loading");
		if (!spinner) return false;
		if (visible) {
			spinner.classList.remove("is-hidden");
		} else {
			spinner.classList.add("is-hidden");
		}
	}
	
	updateProgressBar() {
		const { video, currentTimeText, progressBar } = this.#ELEMENTS;
		if (this.#VIDEO_STATE.isDragging) return;

		const percentage = (this.#VIDEO_STATE.totalDuration > 0) ? (video.currentTime / this.#VIDEO_STATE.totalDuration) * 100 : 0;

		progressBar.style.width = `${percentage}%`;

		currentTimeText.textContent = this.formatTime(video.currentTime);
	}

	updateProgressFromEvent(e) {
		const { left, width } = this.#ELEMENTS.progressContainer.getBoundingClientRect();
		const x = e.clientX - left;
		const ratio = x / width;
		const newTime = Math.min(Math.max(0, ratio * this.#VIDEO_STATE.totalDuration), this.#VIDEO_STATE.totalDuration);
		this.updateProgressBarTo(newTime);
	}

    updateProgressBarTo(time) {
        const { currentTimeText, progressBar } = this.#ELEMENTS;
        const percentage = (time / this.#VIDEO_STATE.totalDuration) * 100;
        currentTimeText.textContent = this.formatTime(time);
        progressBar.style.width = percentage + '%';
    }

	formatTime(seconds) {
        let minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);

        minutes = ("0" + minutes).slice(-2);
        seconds = ("0" + seconds).slice(-2);

        return `${minutes}:${seconds}`;
    }

	toggleFullscreen() {
		const target = this.#ELEMENTS.wrapper;
		this.#ELEMENTS.video.focus();
		if (!document.fullscreenElement) {
			this.#SCROLL_POS = window.scrollY;
			if (target.requestFullscreen) {
				target.requestFullscreen();
			} else if (target.mozRequestFullScreen) {
				target.mozRequestFullScreen();
			} else if (this.#ELEMENTS.video.webkitEnterFullscreen) {
				this.#ELEMENTS.video.webkitEnterFullscreen();
			}
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			} else if (document.mozExitFullScreen) {
				document.mozExitFullScreen();
			} else if (document.webkitExitFullscreen) {
				document.webkitExitFullscreen();
			}
		}
	}
}