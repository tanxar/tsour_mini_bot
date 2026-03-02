import React from 'react';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import App from './App';
import './index.css';

const twaReturnUrl = window.location.href;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <TonConnectUIProvider
      manifestUrl="https://tsour-mini-bot.vercel.app/tonconnect-manifest.json"
      actionsConfiguration={{
        // Return to the current mini app URL after wallet interaction.
        twaReturnUrl,
      }}
      enableAndroidBackHandler={false}
    >
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>
);
