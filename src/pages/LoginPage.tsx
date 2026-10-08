import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { apiFetch, getApiUrl, saveApiUrl, saveToken } from '../api';
import { previewUsername } from '../utils/usernames';
import ProvinceMunicipalityFields from '../components/ProvinceMunicipalityFields';
import { isValidBirthDate, isValidEmail, isValidPhone, isValidTaxCode, sanitizePhone } from '../utils/fieldValidation';
import styles from './LoginPage.styles';

type AuthMode = 'login' | 'register';
type PhotonProperties = {
  street?: string;
  housenumber?: string;
  name?: string;
  type?: string;
  city?: string;
  postcode?: string;
  countrycode?: string;
  osm_type?: string;
  osm_id?: number;
};
type PhotonFeature = { properties: PhotonProperties };

function normalizeLocationName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('it');
}

export default function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [registrationUsername, setRegistrationUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [province, setProvince] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressVerified, setAddressVerified] = useState(false);
  const [selectedStreetPostcode, setSelectedStreetPostcode] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<PhotonFeature[]>([]);
  const [addressSearchError, setAddressSearchError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [showServer, setShowServer] = useState(false);
  const [linkExisting, setLinkExisting] = useState(false);
  const [showLinkPrompt, setShowLinkPrompt] = useState(false);
  const checkedContactPair = useRef('');
  const contactLookupId = useRef(0);
  useEffect(() => { getApiUrl().then(setApiUrl); }, []);

  useEffect(() => {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    setRegistrationUsername(previewUsername(normalizedFirstName, normalizedLastName));
    if (mode !== 'register' || linkExisting || !normalizedFirstName || !normalizedLastName) return;

    let active = true;
    const timeoutId = setTimeout(async () => {
      try {
        const result = await apiFetch<{ username: string }>('/api/mobile/auth/username-preview', {
          method: 'POST',
          body: JSON.stringify({ first_name: normalizedFirstName, last_name: normalizedLastName }),
        });
        if (active) setRegistrationUsername(result.username);
      } catch {
        // Keep the local preview available if the lookup cannot reach the API.
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [firstName, lastName, mode, linkExisting]);

  useEffect(() => {
    if (mode !== 'register' || linkExisting || !municipality || addressVerified || address.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setAddressSearchError('');
      try {
        const query = [address.trim(), municipality.trim()].filter(Boolean).join(' ');
        const params = new URLSearchParams({ q: query, limit: '10', countrycode: 'IT' });
        params.append('layer', 'street');
        params.append('layer', 'house');
        const response = await fetch(`https://photon.komoot.io/api/?${params}`, {
          headers: { 'Accept-Language': 'it' },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Ricerca indirizzi non disponibile');
        const data = await response.json() as { features?: PhotonFeature[] };
        const suggestions = (data.features ?? []).filter(({ properties }) =>
          properties.countrycode?.toUpperCase() === 'IT'
          && (properties.type === 'street' || properties.type === 'house')
          && (properties.street || properties.name)
          && normalizeLocationName(properties.city ?? '') === normalizeLocationName(municipality)
          && properties.postcode,
        );
        setAddressSuggestions(suggestions);
        if (suggestions.length === 0) setAddressSearchError('Nessun indirizzo trovato nel comune selezionato.');
      } catch {
        if (!controller.signal.aborted) setAddressSearchError('Ricerca indirizzi non disponibile. Riprova tra poco.');
      }
    }, 450);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [address, addressVerified, linkExisting, mode, municipality]);

  const checkExistingProfile = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    if (mode !== 'register' || !isValidEmail(normalizedEmail) || !isValidPhone(normalizedPhone)) return;

    const contactPair = `${normalizedEmail}\n${normalizedPhone}`;
    if (checkedContactPair.current === contactPair) return;
    checkedContactPair.current = contactPair;
    const lookupId = ++contactLookupId.current;

    try {
      const result = await apiFetch<{ link_available: boolean }>('/api/mobile/auth/link-check', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, phone: normalizedPhone }),
      });
      if (lookupId !== contactLookupId.current || !result.link_available) return;
      setShowLinkPrompt(true);
    } catch {
      checkedContactPair.current = '';
    }
  };

  const updateEmail = (value: string) => {
    setEmail(value);
    setLinkExisting(false);
    checkedContactPair.current = '';
    contactLookupId.current += 1;
  };

  const updatePhone = (value: string) => {
    setPhone(sanitizePhone(value));
    setLinkExisting(false);
    checkedContactPair.current = '';
    contactLookupId.current += 1;
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setLinkExisting(false);
    checkedContactPair.current = '';
    contactLookupId.current += 1;
  };

  const selectAddress = (properties: PhotonProperties) => {
    const street = properties.street ?? properties.name;
    setAddress([street, properties.housenumber].filter(Boolean).join(' '));
    setPostalCode(properties.postcode ?? '');
    setAddressVerified(true);
    setSelectedStreetPostcode(properties.postcode ?? '');
    setAddressSuggestions([]);
    setAddressSearchError('');
  };

  const submit = async () => {
    const normalizedEmail = email.trim();
    const normalizedPhone = phone.trim();
    const normalizedUsername = username.trim();
    if (!password || (mode === 'login' && !normalizedUsername) || (mode === 'register' && (!normalizedEmail || !normalizedPhone || (!linkExisting && (!firstName.trim() || !lastName.trim()))))) {
      Alert.alert('Dati mancanti', mode === 'register' ? 'Nome, cognome, email, telefono e password sono obbligatori.' : 'Inserisci username e password.');
      return;
    }
    if (mode === 'register' && password.length < 8) {
      Alert.alert('Password non valida', 'La password deve contenere almeno 8 caratteri.');
      return;
    }
    if (mode === 'register' && (!isValidEmail(normalizedEmail) || !isValidPhone(normalizedPhone))) {
      Alert.alert('Contatti non validi', 'Inserisci un’email valida e un telefono di 10 cifre.');
      return;
    }
    if (mode === 'register' && !linkExisting && !isValidTaxCode(taxCode)) {
      Alert.alert('Codice fiscale non valido', 'Controlla il formato del codice fiscale.');
      return;
    }
    if (mode === 'register' && !linkExisting && (!province || !municipality)) {
      Alert.alert('Località mancante', 'Seleziona provincia e comune.');
      return;
    }
    if (mode === 'register' && !linkExisting && !isValidBirthDate(birthDate)) {
      Alert.alert('Data non valida', 'Inserisci la data nel formato AAAA-MM-GG.');
      return;
    }
    if (mode === 'register' && !linkExisting && (!/^\d{5}$/.test(postalCode) || Boolean(selectedStreetPostcode && postalCode !== selectedStreetPostcode))) {
      Alert.alert('CAP non valido', 'Inserisci il CAP corretto per la via selezionata.');
      return;
    }
    if (mode === 'register' && !linkExisting && !addressVerified) {
      Alert.alert('Indirizzo non verificato', 'Seleziona una via dai suggerimenti del comune.');
      return;
    }

    setLoading(true);
    try {
      const path = mode === 'login'
        ? '/api/mobile/auth/token'
        : linkExisting
          ? '/api/mobile/auth/link'
          : '/api/mobile/auth/register';
      const body = mode === 'login'
        ? { username: normalizedUsername, password }
        : linkExisting
          ? { email: normalizedEmail, phone: normalizedPhone, password }
          : { first_name: firstName, last_name: lastName, birth_date: birthDate.trim() || null, phone: normalizedPhone, email: normalizedEmail, tax_code: taxCode.trim().toUpperCase(), password, province: province.trim(), municipality: municipality.trim(), postal_code: postalCode, address: address.trim() };
      const result = await apiFetch<{ access_token: string; username: string }>(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      await saveToken(result.access_token);
      onSuccess();
    } catch (error) {
      Alert.alert('Accesso non riuscito', error instanceof Error ? error.message : 'Riprova tra poco.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.grow}>
        <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
          <Brand />
          <View style={styles.authCard}>
            <View style={styles.segment}>
              <Segment active={mode === 'login'} label="Accedi" onPress={() => changeMode('login')} />
              <Segment active={mode === 'register'} label="Registrati" onPress={() => changeMode('register')} />
            </View>
            {mode === 'register' && <>
              {!linkExisting && <>
                <Field label="Nome" value={firstName} onChangeText={setFirstName} invalid={!firstName.trim()} valid={Boolean(firstName.trim())} />
                <Field label="Cognome" value={lastName} onChangeText={setLastName} invalid={!lastName.trim()} valid={Boolean(lastName.trim())} />
                <Field label="Data di nascita (opzionale)" value={birthDate} onChangeText={setBirthDate} placeholder="AAAA-MM-GG" maxLength={10} invalid={Boolean(birthDate) && !isValidBirthDate(birthDate)} valid={Boolean(birthDate) && isValidBirthDate(birthDate)} />
                <Field label="Codice fiscale (opzionale)" value={taxCode} onChangeText={(value) => setTaxCode(value.toUpperCase())} maxLength={16} invalid={Boolean(taxCode) && !isValidTaxCode(taxCode)} valid={Boolean(taxCode) && isValidTaxCode(taxCode)} />
              </>}
              {mode === 'register' && <Field label="Telefono obbligatorio" value={phone} onChangeText={updatePhone} onBlur={checkExistingProfile} keyboardType="phone-pad" maxLength={10} invalid={!isValidPhone(phone)} valid={isValidPhone(phone)} />}
            </>}
            {mode === 'login' ? (
              <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
            ) : (
              <Field label="Email obbligatoria" value={email} onChangeText={updateEmail} onBlur={checkExistingProfile} keyboardType="email-address" autoCapitalize="none" invalid={!isValidEmail(email)} valid={isValidEmail(email)} />
            )}
            {mode === 'register' && !linkExisting && <>
              <ProvinceMunicipalityFields province={province} municipality={municipality} onChange={(nextProvince, nextMunicipality) => {
                setProvince(nextProvince);
                setMunicipality(nextMunicipality);
                setAddress('');
                setPostalCode('');
                setAddressVerified(false);
                setSelectedStreetPostcode('');
                setAddressSuggestions([]);
                setAddressSearchError('');
              }} />
              <Field label="CAP" value={postalCode} onChangeText={(value) => setPostalCode(value.replace(/\D/g, '').slice(0, 5))} keyboardType="numeric" maxLength={5} invalid={!/^\d{5}$/.test(postalCode) || Boolean(selectedStreetPostcode && postalCode !== selectedStreetPostcode)} valid={/^\d{5}$/.test(postalCode) && (!selectedStreetPostcode || postalCode === selectedStreetPostcode)} />
              {selectedStreetPostcode && postalCode !== selectedStreetPostcode && <Text style={styles.addressWarning}>Il CAP non corrisponde alla via selezionata ({selectedStreetPostcode}).</Text>}
              <Field label="Via / indirizzo" value={address} onChangeText={(value) => { setAddress(value); setAddressVerified(false); }} invalid={!addressVerified} valid={addressVerified} />
              {addressSuggestions.length > 0 && <View style={styles.addressSuggestions}>
                {addressSuggestions.map(({ properties }) => <Pressable key={`${properties.osm_type}-${properties.osm_id}`} onPress={() => selectAddress(properties)} style={styles.addressSuggestion}>
                  <Text style={styles.addressSuggestionText}>{[properties.street ?? properties.name, properties.housenumber].filter(Boolean).join(' ')}{` - ${properties.postcode} ${properties.city}`}</Text>
                </Pressable>)}
              </View>}
              {addressSearchError ? <Text style={styles.addressWarning}>{addressSearchError}</Text> : null}
              <Text style={styles.addressAttribution}>Indirizzi © OpenStreetMap contributors</Text>
              <Field label="Nome utente" value={registrationUsername} editable={false} autoCapitalize="none" valid={Boolean(registrationUsername)} />
            </>}
            <Field label={linkExisting ? 'Password del profilo esistente' : 'Password'} value={password} onChangeText={setPassword} secureTextEntry invalid={mode === 'register' && password.length < 8} valid={mode === 'register' && password.length >= 8} />
            <Pressable style={styles.primaryButton} onPress={submit} disabled={loading}>
              <Text style={styles.primaryButtonText}>{loading ? 'Attendi...' : mode === 'login' ? 'Entra' : linkExisting ? 'Collega e accedi' : 'Crea il tuo account'}</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => setShowServer(!showServer)}>
            <Text style={styles.serverLink}>Configurazione server</Text>
          </Pressable>
          {showServer && <View style={styles.serverBox}>
            <Field label="Indirizzo API" value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" />
            <Pressable style={styles.textButton} onPress={() => saveApiUrl(apiUrl).then(() => Alert.alert('Salvato', 'Indirizzo del server aggiornato.'))}>
              <Text style={styles.textButtonLabel}>Salva indirizzo</Text>
            </Pressable>
          </View>}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal transparent visible={showLinkPrompt} animationType="fade" onRequestClose={() => setShowLinkPrompt(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.linkDialog}>
            <Text style={styles.linkDialogTitle}>Profilo esistente</Text>
            <Text style={styles.linkDialogMessage}>Vuoi usare questo profilo anche per prenotare come cliente? Dovrai accedere con la password già associata al profilo.</Text>
            <View style={styles.linkDialogActions}>
              <Pressable style={styles.linkCancelButton} onPress={() => setShowLinkPrompt(false)}>
                <Text style={styles.linkCancelText}>Non ora</Text>
              </Pressable>
              <Pressable style={styles.linkConfirmButton} onPress={() => { setShowLinkPrompt(false); setLinkExisting(true); }}>
                <Text style={styles.linkConfirmText}>Sì, collega</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Brand() {
  return <View style={styles.brand}><View style={styles.brandMark}><Text style={styles.brandLeaf}>K</Text></View><Text style={styles.brandName}>kali</Text><Text style={styles.brandTagline}>BEAUTY, AT YOUR TIME</Text></View>;
}

function Field(props: { label: string; value: string; onChangeText?: (value: string) => void; onBlur?: () => void; secureTextEntry?: boolean; editable?: boolean; keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric'; autoCapitalize?: 'none' | 'sentences' | 'words'; maxLength?: number; invalid?: boolean; valid?: boolean; placeholder?: string }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{props.label}</Text><TextInput style={[styles.input, props.invalid && styles.inputInvalid, props.valid && styles.inputValid]} value={props.value} onChangeText={props.onChangeText} onBlur={props.onBlur} secureTextEntry={props.secureTextEntry} editable={props.editable ?? true} keyboardType={props.keyboardType} autoCapitalize={props.autoCapitalize ?? 'words'} maxLength={props.maxLength} placeholder={props.placeholder} /></View>;
}

function Segment({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.segmentItem, active && styles.segmentItemActive]}><Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text></Pressable>;
}