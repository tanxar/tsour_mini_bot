import React from 'react';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import App from './App';
import './index.css';

const manifestUrl = new URL('/tonconnect-manifest.json', window.location.origin).toString();
const twaReturnUrl = 'https://t.me/tanxar_bot';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      actionsConfiguration={{
        // Return through Telegram bot after wallet interaction.
        twaReturnUrl,
      }}
      enableAndroidBackHandler={false}
    >
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>
);
