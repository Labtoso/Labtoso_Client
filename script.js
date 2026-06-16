const MANIFEST_PATH = "Downloads/versions.json";
let latestDownloadUrl = "";
let latestDownloadFile = "";

const downloadButton = document.getElementById("downloadButton");
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

function parseVersion(version) {
	return String(version)
		.trim()
		.replace(/^v/i, "")
		.split(".")
		.map((part) => Number.parseInt(part, 10) || 0);
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

function compareVersions(a, b) {
	const av = parseVersion(a);
	const bv = parseVersion(b);
	const maxLength = Math.max(av.length, bv.length);

	for (let i = 0; i < maxLength; i += 1) {
		const left = av[i] ?? 0;
		const right = bv[i] ?? 0;
		if (left > right) return 1;
		if (left < right) return -1;
	}
	return 0;
}

function encodePathSegments(path) {
	return path
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");
}

function setUnavailable(message) {
	if (downloadButton) {
		downloadButton.textContent = "Download nicht verfuegbar";
		downloadButton.disabled = true;
	}
	latestDownloadUrl = "";
	latestDownloadFile = "";
}

async function initDownload() {
	try {
		const response = await fetch(MANIFEST_PATH, { cache: "no-store" });
		if (!response.ok) {
			throw new Error("Manifest konnte nicht geladen werden.");
		}

		const data = await response.json();
		const versions = Array.isArray(data.versions) ? data.versions : [];

		const normalizedVersions = versions
			.filter((entry) => entry && typeof entry.file === "string")
			.map((entry) => {
				const versionFromFile = extractVersionFromFileName(entry.file);
				const version = typeof entry.version === "string" && entry.version.trim()
					? entry.version.trim()
					: versionFromFile;

				return {
					...entry,
					version,
				};
			})
			.filter((entry) => entry.version);

		if (normalizedVersions.length === 0) {
			setUnavailable("Bitte trage in Downloads/versions.json mindestens eine Version ein.");
			return;
		}

		const latest = normalizedVersions.sort((left, right) =>
			compareVersions(right.version, left.version)
		)[0];

		const safeHref = `Downloads/${encodePathSegments(latest.file)}`;
		const latestVersion = latest.version.trim();
		const releaseLabel = extractReleaseLabelFromFileName(latest.file);
		const buttonLabel = releaseLabel ? `v${latestVersion} ${releaseLabel} herunterladen` : `v${latestVersion} herunterladen`;

		if (downloadButton) {
			downloadButton.textContent = buttonLabel;
			downloadButton.disabled = false;
		}
		latestDownloadUrl = safeHref;
		latestDownloadFile = latest.file;
	} catch (error) {
		setUnavailable("Manifest nicht gefunden. Erstelle Downloads/versions.json und starte die Seite mit einem lokalen Webserver.");
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
