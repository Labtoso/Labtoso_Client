const MANIFEST_PATH = "Client Versions/versions.json";
let latestDownloadUrl = "";
let latestDownloadFile = "";

const latestVersionLabel = document.getElementById("latestVersionLabel");
const downloadButton = document.getElementById("downloadButton");
const downloadHint = document.getElementById("downloadHint");

function parseVersion(version) {
	return String(version)
		.trim()
		.replace(/^v/i, "")
		.split(".")
		.map((part) => Number.parseInt(part, 10) || 0);
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
	if (latestVersionLabel) {
		latestVersionLabel.textContent = "Keine gueltige Version gefunden";
	}
	if (downloadButton) {
		downloadButton.textContent = "Download nicht verfuegbar";
		downloadButton.disabled = true;
	}
	latestDownloadUrl = "";
	latestDownloadFile = "";
	if (downloadHint) {
		downloadHint.textContent = message;
	}
}

async function initDownload() {
	try {
		const response = await fetch(MANIFEST_PATH, { cache: "no-store" });
		if (!response.ok) {
			throw new Error("Manifest konnte nicht geladen werden.");
		}

		const data = await response.json();
		const versions = Array.isArray(data.versions) ? data.versions : [];

		const validVersions = versions.filter((entry) =>
			entry && typeof entry.version === "string" && typeof entry.file === "string"
		);

		if (validVersions.length === 0) {
			setUnavailable("Bitte trage in Client Versions/versions.json mindestens eine Version ein.");
			return;
		}

		const latest = validVersions.sort((left, right) =>
			compareVersions(right.version, left.version)
		)[0];

		const safeHref = `Client Versions/${encodePathSegments(latest.file)}`;
		const latestVersion = latest.version.trim();

		if (latestVersionLabel) {
			latestVersionLabel.textContent = `Latest Release: v${latestVersion}`;
		}
		if (downloadButton) {
			downloadButton.textContent = `v${latestVersion} herunterladen`;
			downloadButton.disabled = false;
		}
		latestDownloadUrl = safeHref;
		latestDownloadFile = latest.file;
		if (downloadHint) {
			if (latest.notes) {
				downloadHint.textContent = String(latest.notes);
			} else {
				downloadHint.textContent = "Der Button erkennt die hoechste Version automatisch aus versions.json.";
			}
		}
	} catch (error) {
		setUnavailable("Manifest nicht gefunden. Erstelle Client Versions/versions.json und starte die Seite mit einem lokalen Webserver.");
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
