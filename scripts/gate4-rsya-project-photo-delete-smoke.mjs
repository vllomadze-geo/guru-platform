import { readFile } from "node:fs/promises";

const port = process.env.GURU_CHROME_DEBUG_PORT || "9358";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const goatId = "catalog-item-1786792591872-51f503";
const source = JSON.parse(await readFile(
  "artifacts/gate-4-recovered-groups-v408.json", "utf8"
)).content;
const branchKey = "catalog_item_1786792591872_51f503";

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      const task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id);
      if (message.error) task.reject(new Error(message.error.message));
      else task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", {
  url: "about:blank", browserContextId,
});
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(targets.find((target) => target.id === targetId).webSocketDebuggerUrl);
await page.call("Runtime.enable");
await page.call("Page.enable");
const evaluate = async (expression) => {
  const response = await page.call("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (response.exceptionDetails) throw new Error(
    response.exceptionDetails.exception?.description || response.exceptionDetails.text
  );
  return response.result.value;
};
try {
  await page.call("Page.navigate", { url: appUrl });
  for (let i = 0; i < 100; i += 1) {
    if (await evaluate('document.readyState === "complete" && typeof g4RsyaImagesGalleryHtmlV471 === "function"')) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const fixture = {
    project: source.project,
    sharedEvidence: source.sharedEvidence || {},
    branch: source.gate4Rsya[branchKey],
  };
  const result = await evaluate(`(async () => {
    const fixture = ${JSON.stringify(fixture)};
    state = createFreshWorkspace({ id: 'photo-delete-v488-smoke', name: 'Коза · тест фото' });
    activeProjectId = 'photo-delete-v488-smoke';
    Object.assign(state.project, structuredClone(fixture.project));
    state.sharedEvidence = structuredClone(fixture.sharedEvidence);
    state.gate4Rsya = { ${JSON.stringify(branchKey)}: structuredClone(fixture.branch) };
    const goatId = ${JSON.stringify(goatId)};
    const product = guruV194Product(goatId, state);
    if (!product) throw new Error('Товар Коза не найден');
    const tiny = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==';
    const ghostName = '8EB0B6C9-4BCF-4E2B-85FA-F6C6E2660461.PNG';
    const originalName = 'Фото товара Коза ручной работы — оригинальное имя файла.PNG';
    const ghost = { id: 'ghost-photo-v488', name: ghostName, dataUrl: tiny };
    const keep = { id: 'keep-photo-v488', name: originalName, dataUrl: tiny };
    const gate1 = state.gates.find((gate) => gate.id === 'gate-1');
    gate1.cards = [{ id: product.source.cardId, pageRows: [{
      id: product.source.rowId, catalogItemIdV189: goatId,
      productGalleryPhotos: [ghost, keep],
      productGalleryMainPhotoId: ghost.id,
    }] }];
    const row = gate1.cards[0].pageRows[0];
    const d = ensureGate4RsyaV289(goatId);
    const group = d.groups[0];
    const ad = group.ads[0];
    ad.images = [{ id: 'keep-ad-v488', sourceId: keep.id, name: 'Старое имя.PNG', dataUrl: tiny }];
    ad.previewImageId = ad.images[0].id;
    const secondAd = g4RsyaBlankAdV289({ images: [{
      id: 'ghost-second-ad-v488', sourceId: ghost.id,
      name: ghostName, dataUrl: tiny,
    }], previewImageId: 'ghost-second-ad-v488' });
    group.ads.push(secondAd);
    const reopened = migrateWorkspace(structuredClone(state), activeProjectId);
    const migratedPhoto = reopened.gates.find((gate) => gate.id === 'gate-1')
      .cards[0].pageRows[0].productGalleryPhotos[0];
    const migratedNames = {
      name: migratedPhoto.name,
      originalName: migratedPhoto.originalName,
      adName: reopened.gate4Rsya[${JSON.stringify(branchKey)}].groups[0].ads[1].images[0].name,
    };
    guruMediaNormalizeWorkspaceV490(state);
    ensureGate4RsyaV289(goatId);
    const host = document.createElement('main');
    document.body.replaceChildren(host);
    renderGate = () => {};
    flashSaving = () => {};
    const channel = 'yandex-rsya';
    const currentAds = () => state.gate4Rsya[${JSON.stringify(branchKey)}].groups[0].ads;
    const paint = () => { host.innerHTML = g4RsyaImagesGalleryHtmlV471(
      goatId, channel, group, currentAds()[0],
      g4RsyaProjectOptionsV289(goatId, group).projectPhotos
    ); };
    paint();
    const before = {
      projectCount: row.productGalleryPhotos.length,
      ghostCandidate: Boolean(host.querySelector('[data-g4rsya-v289-add-project-image="ghost-photo-v488"]')),
      originalName: host.querySelector('.g4-rsya-image-card-meta-v471 [data-g4rsya-v490-image-name]')?.value,
      storedName: currentAds()[0].images[0]?.name,
      ghostDisplayName: row.productGalleryPhotos[0].name,
      ghostOriginalName: row.productGalleryPhotos[0].originalName,
    };
    const ghostEditor = host.querySelector('[data-g4rsya-v490-image-name][data-g4rsya-v490-source-id="ghost-photo-v488"]');
    ghostEditor.value = 'Коза — исходное название.jpg';
    ghostEditor.dispatchEvent(new Event('change', { bubbles: true }));
    const afterRename = {
      projectName: row.productGalleryPhotos[0].name,
      adCopyName: currentAds()[1].images[0].name,
      originalName: row.productGalleryPhotos[0].originalName,
    };
    host.querySelector('[data-g4rsya-v488-delete-project-photo="ghost-photo-v488"]').click();
    paint();
    const afterGhostDelete = {
      projectCount: row.productGalleryPhotos.length,
      ghostCandidate: Boolean(host.querySelector('[data-g4rsya-v289-add-project-image="ghost-photo-v488"]')),
      secondAdImages: currentAds()[1].images.length,
      secondAdPreview: currentAds()[1].previewImageId,
    };
    host.querySelector('[data-g4rsya-v289-remove-image="keep-ad-v488"]').click();
    paint();
    const afterSelectedDelete = {
      projectCount: row.productGalleryPhotos.length,
      firstAdImages: currentAds()[0].images.length,
      firstAdPreview: currentAds()[0].previewImageId,
      keepCandidate: Boolean(host.querySelector('[data-g4rsya-v289-add-project-image="keep-photo-v488"]')),
      mainPhotoId: row.productGalleryMainPhotoId,
    };
    row.productGalleryPhotos = [ghost];
    currentAds()[0].images = [
      { id: 'project-copy-v488', sourceId: ghost.id, name: ghostName, dataUrl: tiny },
      { id: 'independent-file-v488', name: 'Личный файл.PNG', dataUrl: tiny },
    ];
    currentAds()[0].previewImageId = 'project-copy-v488';
    const gate1Remove = document.createElement('button');
    gate1Remove.dataset.v22ProductPhotoRemove = ghost.id;
    gate1Remove.dataset.v22ProductPhotoCardId = product.source.cardId;
    gate1Remove.dataset.v22ProductPhotoIndex = '0';
    host.append(gate1Remove);
    gate1Remove.click();
    const afterGate1Delete = {
      projectCount: row.productGalleryPhotos.length,
      imageNames: currentAds()[0].images.map((image) => image.name),
      previewImageId: currentAds()[0].previewImageId,
    };
    currentAds()[0].images.push({
      id: 'orphan-copy-v488', sourceId: 'already-deleted-photo-v488',
      name: 'Старая копия.PNG', dataUrl: tiny,
    });
    ensureGate4RsyaV289(goatId);
    const afterLegacyCleanup = state.gate4Rsya[${JSON.stringify(branchKey)}]
      .groups[0].ads[0].images.map((image) => image.name);
    paint();
    const directEditor = host.querySelector('[data-g4rsya-v490-image-name][data-g4rsya-v490-image-id="independent-file-v488"]');
    directEditor.value = 'Коза — отдельное фото.PNG';
    directEditor.dispatchEvent(new Event('change', { bubbles: true }));
    const directRenamed = currentAds()[0].images[0].name;
    const longName = 'Имя файла ' + 'длинное'.repeat(24) + '.PNG';
    const blob = await fetch(tiny).then((response) => response.blob());
    const prepared = await v22PrepareProductPhoto(new File([blob], longName, { type: 'image/png' }));
    const uuidPrepared = await v22PrepareProductPhoto(new File([blob], ghostName, { type: 'image/png' }));
    guruMediaNormalizeNameV490(uuidPrepared, product.name, 3);
    currentAds()[0].images = [];
    const rsyaUpload = document.createElement('input');
    rsyaUpload.type = 'file';
    rsyaUpload.dataset.g4rsyaV289ImageInput = '';
    rsyaUpload.dataset.g4rsyaV289Product = goatId;
    rsyaUpload.dataset.g4rsyaV289GroupId = group.id;
    rsyaUpload.dataset.g4rsyaV289AdId = currentAds()[0].id;
    host.append(rsyaUpload);
    const rsyaTransfer = new DataTransfer();
    rsyaTransfer.items.add(new File([blob], ghostName, { type: 'image/png' }));
    rsyaUpload.files = rsyaTransfer.files;
    rsyaUpload.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((done) => setTimeout(done, 180));
    const rsyaUploaded = currentAds()[0].images.map((image) => ({
      name: image.name, originalName: image.originalName,
    }));
    const gate1Upload = document.createElement('input');
    gate1Upload.type = 'file';
    gate1Upload.dataset.v22ProductPhotoInput = '';
    gate1Upload.dataset.v22ProductPhotoCardId = product.source.cardId;
    gate1Upload.dataset.v22ProductPhotoIndex = '0';
    host.append(gate1Upload);
    const gate1Transfer = new DataTransfer();
    gate1Transfer.items.add(new File([blob], ghostName, { type: 'image/png' }));
    gate1Upload.files = gate1Transfer.files;
    gate1Upload.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((done) => setTimeout(done, 180));
    const gate1Uploaded = row.productGalleryPhotos.map((photo) => ({
      name: photo.name, originalName: photo.originalName,
    }));
    return { migratedNames, before, afterRename, afterGhostDelete, afterSelectedDelete,
      afterGate1Delete, afterLegacyCleanup, directRenamed,
      uploadNamePreserved: prepared.name === longName,
      uploadNameLength: prepared.name.length,
      uuidUploadName: uuidPrepared.name,
      uuidOriginalName: uuidPrepared.originalName,
      rsyaUploaded, gate1Uploaded,
    };
  })()`);
  if (!result.before.ghostCandidate ||
      !result.migratedNames.name.includes("Коза") ||
      result.migratedNames.originalName !== "8EB0B6C9-4BCF-4E2B-85FA-F6C6E2660461.PNG" ||
      result.migratedNames.adName !== result.migratedNames.name ||
      result.before.originalName !== "Фото товара Коза ручной работы — оригинальное имя файла.PNG" ||
      result.before.storedName !== result.before.originalName ||
      !result.before.ghostDisplayName.includes("Коза") ||
      result.before.ghostOriginalName !== "8EB0B6C9-4BCF-4E2B-85FA-F6C6E2660461.PNG" ||
      result.afterRename.projectName !== "Коза — исходное название.jpg" ||
      result.afterRename.adCopyName !== result.afterRename.projectName ||
      result.afterRename.originalName !== result.before.ghostOriginalName ||
      result.afterGhostDelete.projectCount !== 1 ||
      result.afterGhostDelete.ghostCandidate ||
      result.afterGhostDelete.secondAdImages !== 0 ||
      result.afterGhostDelete.secondAdPreview ||
      result.afterSelectedDelete.projectCount !== 0 ||
      result.afterSelectedDelete.firstAdImages !== 0 ||
      result.afterSelectedDelete.keepCandidate ||
      result.afterSelectedDelete.mainPhotoId ||
      result.afterGate1Delete.projectCount !== 0 ||
      JSON.stringify(result.afterGate1Delete.imageNames) !== JSON.stringify(["Личный файл.PNG"]) ||
      result.afterGate1Delete.previewImageId !== "independent-file-v488" ||
      JSON.stringify(result.afterLegacyCleanup) !== JSON.stringify(["Личный файл.PNG"]) ||
      result.directRenamed !== "Коза — отдельное фото.PNG" ||
      !result.uploadNamePreserved ||
      !result.uuidUploadName.includes("Коза") ||
      result.uuidOriginalName !== result.before.ghostOriginalName ||
      result.rsyaUploaded.length !== 1 ||
      !result.rsyaUploaded[0].name.includes("Коза") ||
      result.rsyaUploaded[0].originalName !== result.before.ghostOriginalName ||
      result.gate1Uploaded.length !== 1 ||
      !result.gate1Uploaded[0].name.includes("Коза") ||
      result.gate1Uploaded[0].originalName !== result.before.ghostOriginalName) {
    throw new Error(`Проверка галереи провалилась: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify(result, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
