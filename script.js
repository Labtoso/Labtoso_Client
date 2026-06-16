const GITHUB_OWNER = "Labtoso";
const GITHUB_REPO = "Labtoso_Client";
const RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
let latestDownloadUrl = "";
let latestDownloadFile = "";

const downloadButton = document.getElementById("downloadButton");
const latestVersion = document.getElementById("latestVersion");
const mouseGlow = document.querySelector(".mouse-glow");

const prefersHover = window.matchMedia("(hover: hover)").matches;

let targetX = window.innerWidth / 2;
let targetY = window.innerHeight / 2;
let currentX = targetX;
let currentY = targetY;
let rafId = 0;

function renderGlow() {
	currentX += (targetX - currentX) * 0.09;
	currentY += (targetY - currentY) * 0.09;

	if (mouseGlow) {
		mouseGlow.style.transform = `translate3d(${currentX - 160}px, ${currentY - 160}px, 0)`;
	}

	rafId = window.requestAnimationFrame(renderGlow);
}

if (mouseGlow && prefersHover) {
	mouseGlow.style.opacity = "1";
	window.addEventListener("pointermove", (event) => {
		targetX = event.clientX;
		targetY = event.clientY;
	});

	window.addEventListener("pointerleave", () => {
		if (mouseGlow) {
			mouseGlow.style.opacity = "0";
		}
	});

	window.addEventListener("pointerenter", () => {
		if (mouseGlow) {
			mouseGlow.style.opacity = "1";
		}
	});

	renderGlow();
}

function extractVersionFromFileName(fileName) {
	const match = String(fileName).match(/(\d+(?:\.\d+)+)/);
	return match ? match[1] : "";
}

function extractReleaseLabelFromFileName(fileName) {
	const lowerName = String(fileName).toLowerCase();
	if (lowerName.includes("snapshot")) {
		return "Snapshot";
	}
	if (lowerName.includes("final")) {
		return "Final";
	}
	return "";
}

function setUnavailable(message) {
	if (downloadButton) {
		downloadButton.textContent = "Download nicht verfuegbar";
		downloadButton.disabled = true;
		downloadButton.title = message;
	}
	if (latestVersion) {
		latestVersion.textContent = "Keine Latest-Release-Version verfuegbar";
	}
	latestDownloadUrl = "";
	latestDownloadFile = "";
}

function buildButtonLabel(version, releaseLabel) {
	return releaseLabel
		? `v${version} ${releaseLabel} herunterladen`
		: `v${version} herunterladen`;
}

function setReadyDownload(downloadUrl, fileName, version) {
	const releaseLabel = extractReleaseLabelFromFileName(fileName);
	const buttonLabel = buildButtonLabel(version, releaseLabel);
	const versionLabel = releaseLabel ? `v${version} ${releaseLabel}` : `v${version}`;

	if (downloadButton) {
		downloadButton.textContent = buttonLabel;
		downloadButton.disabled = false;
		downloadButton.title = `Quelle: ${fileName}`;
	}

	if (latestVersion) {
		latestVersion.textContent = `Aktuelle Version: ${versionLabel}`;
	}

	latestDownloadUrl = downloadUrl;
	latestDownloadFile = fileName;
}

async function loadFromLatestGitHubRelease() {
	const response = await fetch(RELEASES_API, { cache: "no-store" });
	if (!response.ok) {
		throw new Error("release_unavailable");
	}

	const release = await response.json();
	const releaseTagVersion = extractVersionFromFileName(release.tag_name || "");

	const assets = Array.isArray(release.assets) ? release.assets : [];
	const exeEntries = assets
		.filter((asset) =>
			asset &&
			typeof asset.name === "string" &&
			typeof asset.browser_download_url === "string" &&
			typeof asset.updated_at === "string" &&
			asset.name.toLowerCase().endsWith(".exe")
		)
		.map((asset) => {
			const versionFromFile = extractVersionFromFileName(asset.name);
			const version = versionFromFile || releaseTagVersion;

			return {
				file: asset.name,
				downloadUrl: asset.browser_download_url,
				version,
				updatedAt: asset.updated_at,
			};
		})
		.filter((entry) => entry.version);

	if (!exeEntries.length) {
		throw new Error("no_release_exe");
	}

	const latest = [...exeEntries].sort(
		(left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
	)[0];

	if (!latest) {
		throw new Error("no_release_exe");
	}

	return latest;
}

async function initDownload() {
	try {
		const latestRelease = await loadFromLatestGitHubRelease();
		setReadyDownload(
			latestRelease.downloadUrl,
			latestRelease.file,
			latestRelease.version.trim()
		);
	} catch {
		setUnavailable("Kein gueltiges Latest Release mit EXE gefunden. Bitte in GitHub ein Latest Release mit EXE-Asset veroeffentlichen.");
	}
}

if (downloadButton) {
	downloadButton.addEventListener("click", () => {
		if (!latestDownloadUrl) {
			return;
		}

		const link = document.createElement("a");
		link.href = latestDownloadUrl;
		link.download = latestDownloadFile;
		document.body.appendChild(link);
		link.click();
		link.remove();
	});
}

initDownload();
