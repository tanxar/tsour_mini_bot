const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

const connectBtn = document.getElementById('connect-btn');
const addressEl = document.getElementById('address');
const statusEl = document.getElementById('status');

statusEl.textContent = 'Ready. You are inside Telegram Mini App.';

// TonConnect manifest URL – πρέπει να το σερβίρεις από το δικό σου domain
// Π.χ. https://your-domain.com/tonconnect-manifest.json
const TONCONNECT_MANIFEST_URL = `${window.location.origin}/tonconnect-manifest.json`;

const tonConnectUI = new window.TonConnectUI.TonConnectUI({
  manifestUrl: TONCONNECT_MANIFEST_URL
});

connectBtn.addEventListener('click', async () => {
  connectBtn.disabled = true;
  statusEl.textContent = 'Opening Tonkeeper...';

  try {
    const wallet = await tonConnectUI.connectWallet();

    const addr = wallet?.account?.address;
    if (addr) {
      addressEl.style.display = 'block';
      addressEl.textContent = addr;
      statusEl.textContent = 'Connected to Tonkeeper ✅';

      if (tg) {
        tg.HapticFeedback?.impactOccurred('medium');
      }
    } else {
      statusEl.textContent = 'Connected αλλά δεν βρέθηκε διεύθυνση.';
    }
  } catch (err) {
    console.error('TonConnect error', err);
    statusEl.textContent = 'Η σύνδεση ακυρώθηκε ή απέτυχε. Άνοιξε από κινητό με εγκατεστημένο Tonkeeper.';
  } finally {
    connectBtn.disabled = false;
  }
});

