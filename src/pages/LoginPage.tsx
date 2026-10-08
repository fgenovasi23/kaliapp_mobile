import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { apiFetch, getApiUrl, saveApiUrl, saveToken } from '../api';
import { previewUsername } from '../utils/usernames';
import styles from './LoginPage.styles';

type AuthMode = 'login' | 'register';

export default function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registrationUsername, setRegistrationUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [province, setProvince] = useState('');
  const [municipality, setMunicipality] = useState('');
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

  const checkExistingProfile = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    if (mode !== 'register' || !/^\S+@\S+\.\S+$/.test(normalizedEmail) || !normalizedPhone) return;

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
    setPhone(value);
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
          : { first_name: firstName, last_name: lastName, phone: normalizedPhone, email: normalizedEmail, password, province: province.trim(), municipality: municipality.trim() };
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
                <Field label="Nome" value={firstName} onChangeText={setFirstName} />
                <Field label="Cognome" value={lastName} onChangeText={setLastName} />
                <Field label="Provincia" value={province} onChangeText={setProvince} />
                <Field label="Comune" value={municipality} onChangeText={setMunicipality} />
              </>}
              <Field label="Telefono obbligatorio" value={phone} onChangeText={updatePhone} onBlur={checkExistingProfile} keyboardType="phone-pad" />
            </>}
            {mode === 'login' ? (
              <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
            ) : (
              <Field label="Email obbligatoria" value={email} onChangeText={updateEmail} onBlur={checkExistingProfile} keyboardType="email-address" autoCapitalize="none" />
            )}
            {mode === 'register' && !linkExisting && (
              <Field label="Username" value={registrationUsername} editable={false} autoCapitalize="none" />
            )}
            <Field label={linkExisting ? 'Password del profilo esistente' : 'Password'} value={password} onChangeText={setPassword} secureTextEntry />
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

function Field(props: { label: string; value: string; onChangeText?: (value: string) => void; onBlur?: () => void; secureTextEntry?: boolean; editable?: boolean; keyboardType?: 'default' | 'email-address' | 'phone-pad'; autoCapitalize?: 'none' | 'sentences' | 'words' }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{props.label}</Text><TextInput style={styles.input} value={props.value} onChangeText={props.onChangeText} onBlur={props.onBlur} secureTextEntry={props.secureTextEntry} editable={props.editable ?? true} keyboardType={props.keyboardType} autoCapitalize={props.autoCapitalize ?? 'words'} /></View>;
}

function Segment({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.segmentItem, active && styles.segmentItemActive]}><Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text></Pressable>;
}