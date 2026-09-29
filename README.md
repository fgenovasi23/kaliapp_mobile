# Kali Mobile

App Expo/React Native per i clienti Kali: registrazione, accesso, scelta di centro, servizi, estetista, orario e gestione delle prenotazioni.

## Avvio Android

1. Avvia il backend dalla cartella `kaliapp_backend`:

   ```powershell
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. Dalla cartella `kaliapp_mobile`, avvia Expo:

   ```powershell
   npm run android
   ```

L'app usa `http://10.0.2.2:8000` per l'emulatore Android. Su dispositivo fisico, inserisci nella schermata di accesso o nel profilo l'IP LAN del PC, ad esempio `http://192.168.1.25:8000`. Il telefono e il PC devono essere sulla stessa rete.

In alternativa, imposta l'URL prima dell'avvio con un file `.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.25:8000
```

## iOS

Il progetto e compatibile con iOS. Sul Mac di deploy installa le dipendenze con `npm install`, configura `EXPO_PUBLIC_API_URL` con l'host raggiungibile dal dispositivo e avvia `npm run ios` oppure crea una build Expo/EAS.

## API richieste

Il backend include il router `/api/mobile`, con registrazione cliente, catalogo pubblico, disponibilita, prenotazioni, elenco e annullamento. Le nuove tabelle vengono create automaticamente al prossimo avvio del backend.