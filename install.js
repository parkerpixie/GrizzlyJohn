(() => {
  const gate = document.getElementById('installGate');
  if (!gate) return;

  const STORAGE_KEY = 'grizzlyjohn:installComplete';
  const DISMISSED_KEY = 'grizzlyjohn:installDismissed';
  const iphoneChoice = document.getElementById('chooseIphone');
  const androidChoice = document.getElementById('chooseAndroid');
  const iphoneSteps = document.getElementById('iphoneSteps');
  const androidSteps = document.getElementById('androidSteps');
  const nativeInstall = document.getElementById('nativeInstall');
  const doneButtons = gate.querySelectorAll('[data-install-done]');
  const notNowButtons = gate.querySelectorAll('[data-install-not-now]');

  let deferredPrompt = null;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  function markDone() {
    localStorage.setItem(STORAGE_KEY, 'true');
    localStorage.removeItem(DISMISSED_KEY);
    gate.hidden = true;
    document.body.classList.remove('install-gate-active');
  }

  function dismissPermanently() {
    localStorage.setItem(DISMISSED_KEY, 'true');
    gate.hidden = true;
    document.body.classList.remove('install-gate-active');
  }

  function showGate() {
    gate.hidden = false;
    document.body.classList.add('install-gate-active');
  }

  function choose(type) {
    const iphone = type === 'iphone';
    iphoneChoice?.classList.toggle('is-active', iphone);
    androidChoice?.classList.toggle('is-active', !iphone);
    iphoneSteps.hidden = !iphone;
    androidSteps.hidden = iphone;
    if (!iphone) nativeInstall.hidden = !deferredPrompt;
    const target = iphone ? iphoneSteps : androidSteps;
    setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    if (!androidSteps.hidden) nativeInstall.hidden = false;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    markDone();
  });

  nativeInstall?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') markDone();
    deferredPrompt = null;
    nativeInstall.hidden = true;
  });

  iphoneChoice?.addEventListener('click', () => choose('iphone'));
  androidChoice?.addEventListener('click', () => choose('android'));
  doneButtons.forEach(button => button.addEventListener('click', markDone));
  notNowButtons.forEach(button => button.addEventListener('click', dismissPermanently));

  window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    }

    const jenScript = document.createElement('script');
    jenScript.src = './jen-quests.js';
    jenScript.defer = true;
    document.body.appendChild(jenScript);
  });

  if (isStandalone()) {
    localStorage.setItem(STORAGE_KEY, 'true');
    gate.hidden = true;
    return;
  }

  if (localStorage.getItem(STORAGE_KEY) === 'true' || localStorage.getItem(DISMISSED_KEY) === 'true') {
    gate.hidden = true;
    return;
  }

  showGate();

  const ua = navigator.userAgent || '';
  const likelyIOS = /iPhone|iPad|iPod/i.test(ua);
  const likelyAndroid = /Android/i.test(ua);
  if (likelyIOS) choose('iphone');
  if (likelyAndroid) choose('android');
})();
