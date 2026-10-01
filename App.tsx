import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiFetch, ApiError, clearToken, getApiUrl, getToken, saveApiUrl, saveToken } from './src/api';
import type { Appointment, Beautician, BookingDraft, Center, Profile, Service } from './src/types';

type AuthMode = 'login' | 'register';
type Tab = 'discover' | 'appointments' | 'profile';

const emptyDraft: BookingDraft = { center: null, services: [], beautician: null, date: null, time: null };
const dates = Array.from({ length: 30 }, (_, index) => {
  const value = new Date();
  value.setDate(value.getDate() + index + 1);
  return value.toISOString().slice(0, 10);
});

const formatDate = (value: string) => new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`));
const formatDateTime = (value: string) => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const money = (value: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);

export default function App() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const handleLogout = async () => {
    await clearToken();
    setAuthenticated(false);
  };

  useEffect(() => {
    getToken().then((token) => {
      setAuthenticated(Boolean(token));
      setReady(true);
    });
  }, []);

  if (!ready) return <View style={styles.loader}><ActivityIndicator color="#9f7b64" size="large" /></View>;
  return authenticated ? <CustomerApp onLogout={handleLogout} /> : <AuthScreen onSuccess={() => setAuthenticated(true)} />;
}

function Brand() {
  return <View style={styles.brand}><View style={styles.brandMark}><Text style={styles.brandLeaf}>K</Text></View><Text style={styles.brandName}>kali</Text><Text style={styles.brandTagline}>BEAUTY, AT YOUR TIME</Text></View>;
}

function AuthScreen({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [showServer, setShowServer] = useState(false);
  const identifierLabel = mode === 'login' ? 'Email o telefono' : 'Email obbligatoria';

  useEffect(() => { getApiUrl().then(setApiUrl); }, []);
  const submit = async () => {
    const normalizedEmail = email.trim();
    const normalizedPhone = phone.trim();
    if (!password || (mode === 'login' && !normalizedEmail) || (mode === 'register' && (!firstName || !lastName || !normalizedEmail || !normalizedPhone))) {
      Alert.alert('Dati mancanti', mode === 'register' ? 'Nome, cognome, email, telefono e password sono obbligatori.' : 'Inserisci email o telefono e password.');
      return;
    }
    setLoading(true);
    try {
      const result = await apiFetch<{ access_token: string }>(mode === 'login' ? '/api/mobile/auth/token' : '/api/mobile/auth/register', {
        method: 'POST',
        body: JSON.stringify(mode === 'login' ? { email: normalizedEmail, password } : { first_name: firstName, last_name: lastName, phone: normalizedPhone, email: normalizedEmail, password }),
      });
      await saveToken(result.access_token);
      onSuccess();
    } catch (error) {
      Alert.alert('Accesso non riuscito', error instanceof Error ? error.message : 'Riprova tra poco.');
    } finally { setLoading(false); }
  };

  return <SafeAreaView style={styles.screen}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.grow}><ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled"><Brand /><View style={styles.authCard}><View style={styles.segment}><Segment active={mode === 'login'} label="Accedi" onPress={() => setMode('login')} /><Segment active={mode === 'register'} label="Registrati" onPress={() => setMode('register')} /></View>
    {mode === 'register' && <><Field label="Nome" value={firstName} onChangeText={setFirstName} /><Field label="Cognome" value={lastName} onChangeText={setLastName} /><Field label="Telefono obbligatorio" value={phone} onChangeText={setPhone} keyboardType="phone-pad" /> </>}
    <Field label={identifierLabel} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
    <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
    <Pressable style={styles.primaryButton} onPress={submit} disabled={loading}><Text style={styles.primaryButtonText}>{loading ? 'Attendi...' : mode === 'login' ? 'Entra' : 'Crea il tuo account'}</Text></Pressable>
  </View><Pressable onPress={() => setShowServer(!showServer)}><Text style={styles.serverLink}>Configurazione server</Text></Pressable>{showServer && <View style={styles.serverBox}><Field label="Indirizzo API" value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" /><Pressable style={styles.textButton} onPress={() => saveApiUrl(apiUrl).then(() => Alert.alert('Salvato', 'Indirizzo del server aggiornato.'))}><Text style={styles.textButtonLabel}>Salva indirizzo</Text></Pressable></View>}</ScrollView></KeyboardAvoidingView><StatusBar style="dark" /></SafeAreaView>;
}

function CustomerApp({ onLogout }: { onLogout: () => Promise<void> | void }) {
  const [tab, setTab] = useState<Tab>('discover');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const loadAppointments = () => apiFetch<Appointment[]>('/api/mobile/appointments').then(setAppointments).catch(() => undefined);
  useEffect(() => { loadAppointments(); }, []);
  return <SafeAreaView style={styles.screen}><View style={styles.appHeader}><View style={styles.headerTitleWrap}><Text style={styles.headerLogo}>kali</Text><Text style={styles.headerSubtitle}>{tab === 'discover' ? 'Prenota il tuo momento' : tab === 'appointments' ? 'I tuoi appuntamenti' : 'Il tuo profilo'}</Text></View><Pressable style={styles.headerLogoutButton} onPress={onLogout}><Text style={styles.headerLogoutText}>Esci</Text></Pressable></View><View style={styles.grow}>{tab === 'discover' && <Discover onBooked={() => { loadAppointments(); setTab('appointments'); }} />}{tab === 'appointments' && <Appointments appointments={appointments} reload={loadAppointments} />}{tab === 'profile' && <Profile onLogout={onLogout} />}</View><View style={styles.tabBar}><TabButton label="Scopri" active={tab === 'discover'} onPress={() => setTab('discover')} /><TabButton label="I miei" active={tab === 'appointments'} onPress={() => setTab('appointments')} /><TabButton label="Profilo" active={tab === 'profile'} onPress={() => setTab('profile')} /></View><StatusBar style="dark" /></SafeAreaView>;
}

function Discover({ onBooked }: { onBooked: () => void }) {
  const [centers, setCenters] = useState<Center[]>([]);
  const [draft, setDraft] = useState<BookingDraft>(emptyDraft);
  const [services, setServices] = useState<Service[]>([]);
  const [beauticians, setBeauticians] = useState<Beautician[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { apiFetch<Center[]>('/api/mobile/centers').then(setCenters).catch(showError).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    if (!draft.center) return;
    setServices([]); setBeauticians([]); setSlots([]);
    Promise.all([apiFetch<Service[]>(`/api/mobile/centers/${draft.center.id}/services`), apiFetch<Beautician[]>(`/api/mobile/centers/${draft.center.id}/beauticians`)]).then(([nextServices, nextBeauticians]) => { setServices(nextServices); setBeauticians(nextBeauticians); }).catch(showError);
  }, [draft.center?.id]);
  useEffect(() => {
    if (!draft.center || !draft.beautician || !draft.date || draft.services.length === 0) return;
    apiFetch<{ available_slots: string[] }>('/api/mobile/availability/slots', { method: 'POST', body: JSON.stringify({ center_id: draft.center.id, beautician_id: draft.beautician.id, service_ids: draft.services.map((service) => service.id), start_at: `${draft.date}T12:00:00` }) }).then((result) => setSlots(result.available_slots.map((slot) => slot.slice(11, 16)))).catch(showError);
  }, [draft.center?.id, draft.beautician?.id, draft.date, draft.services.map((service) => service.id).join(',')]);

  const selectCenter = (center: Center) => setDraft({ ...emptyDraft, center });
  const toggleService = (service: Service) => setDraft((current) => ({ ...current, services: current.services.some((item) => item.id === service.id) ? current.services.filter((item) => item.id !== service.id) : [...current.services, service], time: null }));
  const book = async () => {
    if (!draft.center || !draft.beautician || !draft.date || !draft.time || draft.services.length === 0) return;
    setSubmitting(true);
    try { await apiFetch('/api/mobile/appointments', { method: 'POST', body: JSON.stringify({ center_id: draft.center.id, beautician_id: draft.beautician.id, service_ids: draft.services.map((service) => service.id), start_at: `${draft.date}T${draft.time}:00` }) }); Alert.alert('Prenotazione confermata', 'Trovi i dettagli nella sezione I miei.'); setDraft(emptyDraft); onBooked(); } catch (error) { showError(error); } finally { setSubmitting(false); }
  };
  const total = draft.services.reduce((sum, service) => sum + Number(service.price), 0);
  return <ScrollView contentContainerStyle={styles.content}>{loading ? <ActivityIndicator color="#9f7b64" /> : <><SectionTitle number="01" title="Scegli il centro" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>{centers.map((center) => <Choice key={center.id} active={draft.center?.id === center.id} title={center.name} subtitle={center.address || 'Scopri il centro'} onPress={() => selectCenter(center)} />)}</ScrollView>
    {draft.center && <><SectionTitle number="02" title="Scegli i servizi" /><View style={styles.choiceGrid}>{services.map((service) => <Choice key={service.id} active={draft.services.some((item) => item.id === service.id)} title={service.name} subtitle={`${service.duration_minutes} min Â· ${money(Number(service.price))}`} onPress={() => toggleService(service)} />)}</View><SectionTitle number="03" title="Scegli l'estetista" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>{beauticians.map((beautician) => <Choice key={beautician.id} active={draft.beautician?.id === beautician.id} title={`${beautician.first_name} ${beautician.last_name}`} subtitle="Estetista" onPress={() => setDraft({ ...draft, beautician, time: null })} />)}</ScrollView></>}
    {draft.beautician && draft.services.length > 0 && <><SectionTitle number="04" title="Scegli il giorno" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>{dates.map((date) => <Pressable key={date} style={[styles.dateChip, draft.date === date && styles.dateChipActive]} onPress={() => setDraft({ ...draft, date, time: null })}><Text style={[styles.dateChipText, draft.date === date && styles.dateChipTextActive]}>{formatDate(date)}</Text></Pressable>)}</ScrollView></>}
    {draft.date && <><SectionTitle number="05" title="Scegli l'orario" /><View style={styles.times}>{slots.length === 0 ? <Text style={styles.muted}>Nessun orario disponibile per questo giorno.</Text> : slots.map((time) => <Pressable key={time} style={[styles.timeChip, draft.time === time && styles.timeChipActive]} onPress={() => setDraft({ ...draft, time })}><Text style={draft.time === time ? styles.timeChipTextActive : styles.timeChipText}>{time}</Text></Pressable>)}</View></>}
    {draft.time && <View style={styles.summary}><Text style={styles.summaryTitle}>{draft.center?.name}</Text><Text style={styles.summaryText}>{draft.services.map((service) => service.name).join(' Â· ')}</Text><Text style={styles.summaryText}>{formatDate(draft.date!)} alle {draft.time} Â· {money(total)}</Text><Pressable style={styles.primaryButton} onPress={book} disabled={submitting}><Text style={styles.primaryButtonText}>{submitting ? 'Conferma in corso...' : 'Conferma prenotazione'}</Text></Pressable></View>}</>}</ScrollView>;
}

function Appointments({ appointments, reload }: { appointments: Appointment[]; reload: () => void }) {
  const cancel = (appointment: Appointment) => Alert.alert('Annullare?', `${appointment.center_name}, ${formatDateTime(appointment.start_at)}`, [{ text: 'Mantieni', style: 'cancel' }, { text: 'Annulla appuntamento', style: 'destructive', onPress: () => apiFetch(`/api/mobile/appointments/${appointment.id}`, { method: 'DELETE' }).then(reload).catch(showError) }]);
  return <ScrollView contentContainerStyle={styles.content}>{appointments.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>Nessun appuntamento</Text><Text style={styles.muted}>Quando prenoterai, i dettagli compariranno qui.</Text></View> : appointments.map((appointment) => <View key={appointment.id} style={styles.appointmentCard}><View style={styles.statusRow}><Text style={styles.cardEyebrow}>{appointment.status === 'CONFIRMED' ? 'CONFERMATO' : 'PRENOTATO'}</Text><Text style={styles.cardDate}>{formatDateTime(appointment.start_at)}</Text></View><Text style={styles.cardTitle}>{appointment.center_name}</Text><Text style={styles.cardBody}>{appointment.services.join(' Â· ')}</Text><Text style={styles.cardBody}>con {appointment.beautician_name}</Text>{new Date(appointment.start_at) > new Date() && <Pressable onPress={() => cancel(appointment)}><Text style={styles.cancel}>Annulla prenotazione</Text></Pressable>}</View>)}</ScrollView>;
}

function Profile({ onLogout }: { onLogout: () => Promise<void> | void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  useEffect(() => { apiFetch<Profile>('/api/mobile/me').then(setProfile).catch(showError); getApiUrl().then(setApiUrl); }, []);
  return <ScrollView contentContainerStyle={styles.content}>{profile && <View style={styles.profileCard}><View style={styles.avatar}><Text style={styles.avatarText}>{profile.first_name[0]}{profile.last_name[0]}</Text></View><Text style={styles.profileName}>{profile.first_name} {profile.last_name}</Text><Text style={styles.muted}>{profile.email}</Text>{Boolean(profile.phone) && <Text style={styles.muted}>{profile.phone}</Text>}</View>}<View style={styles.serverBox}><Text style={styles.fieldLabel}>INDIRIZZO BACKEND</Text><TextInput style={styles.input} value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" /><Pressable style={styles.textButton} onPress={() => saveApiUrl(apiUrl).then(() => Alert.alert('Salvato', 'Il nuovo server sarÃ  usato per le prossime richieste.'))}><Text style={styles.textButtonLabel}>Aggiorna server</Text></Pressable></View><Pressable style={styles.logoutButton} onPress={() => { void onLogout(); }}><Text style={styles.logoutText}>Esci dall'account</Text></Pressable></ScrollView>;
}

function Field(props: { label: string; value: string; onChangeText: (value: string) => void; secureTextEntry?: boolean; keyboardType?: 'default' | 'email-address' | 'phone-pad'; autoCapitalize?: 'none' | 'sentences' | 'words' }) { return <View style={styles.field}><Text style={styles.fieldLabel}>{props.label}</Text><TextInput style={styles.input} value={props.value} onChangeText={props.onChangeText} secureTextEntry={props.secureTextEntry} keyboardType={props.keyboardType} autoCapitalize={props.autoCapitalize ?? 'words'} /></View>; }
function Segment({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.segmentItem, active && styles.segmentItemActive]}><Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text></Pressable>; }
function Choice({ active, title, subtitle, onPress }: { active: boolean; title: string; subtitle: string; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><Text style={[styles.choiceTitle, active && styles.choiceTitleActive]}>{title}</Text><Text style={[styles.choiceSubtitle, active && styles.choiceSubtitleActive]}>{subtitle}</Text></Pressable>; }
function SectionTitle({ number, title }: { number: string; title: string }) { return <View style={styles.sectionTitle}><Text style={styles.sectionNumber}>{number}</Text><Text style={styles.sectionText}>{title}</Text></View>; }
function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.tabButton}><View style={[styles.tabDot, active && styles.tabDotActive]} /><Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text></Pressable>; }
function showError(error: unknown) { Alert.alert('Operazione non riuscita', error instanceof ApiError || error instanceof Error ? error.message : 'Riprova tra poco.'); }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fffaf7' },
  grow: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffaf7' },
  authContent: { padding: 24, paddingBottom: 48, flexGrow: 1, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: 36 },
  brandMark: { width: 70, height: 70, borderRadius: 35, borderWidth: 1, borderColor: '#b79680', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  brandLeaf: { fontFamily: 'serif', color: '#9f7b64', fontSize: 38 },
  brandName: { fontFamily: 'serif', fontSize: 42, color: '#725849', letterSpacing: 1 },
  brandTagline: { fontSize: 10, color: '#9f7b64', letterSpacing: 2, marginTop: 4 },
  authCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#eadbd1', padding: 20, borderRadius: 8 },
  segment: { flexDirection: 'row', backgroundColor: '#f6eee9', padding: 3, borderRadius: 6, marginBottom: 18 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 4 },
  segmentItemActive: { backgroundColor: '#ffffff' },
  segmentText: { color: '#8c7669', fontSize: 14 },
  segmentTextActive: { color: '#654c3e', fontWeight: '700' },
  field: { marginBottom: 14 },
  fieldLabel: { color: '#9a7a67', fontSize: 10, fontWeight: '700', letterSpacing: 1.1, marginBottom: 7 },
  input: { borderBottomWidth: 1, borderColor: '#d8c5ba', color: '#3f352f', fontSize: 16, paddingVertical: 9 },
  primaryButton: { backgroundColor: '#795948', paddingVertical: 15, alignItems: 'center', marginTop: 10, borderRadius: 5 },
  primaryButtonText: { color: '#fffaf7', fontSize: 15, fontWeight: '700' },
  serverLink: { color: '#876a59', textAlign: 'center', marginTop: 22, fontSize: 13 },
  serverBox: { padding: 16, marginTop: 18, backgroundColor: '#f8f0eb', borderRadius: 6 },
  textButton: { marginTop: 10 },
  textButtonLabel: { color: '#75523f', fontWeight: '700', fontSize: 14 },
  centerSelectBox: { marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderColor: '#eee0d8' },
  centerChip: { borderWidth: 1, borderColor: '#d0b5a3', backgroundColor: '#f7f0ec', paddingHorizontal: 14, paddingVertical: 10, marginRight: 10, borderRadius: 18 },
  centerChipActive: { backgroundColor: '#7b5845', borderColor: '#7b5845' },
  centerChipText: { color: '#5a4034', fontWeight: '600' },
  centerChipTextActive: { color: '#fffaf7', fontWeight: '700' },
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8, backgroundColor: '#fffaf7' },
  headerTitleWrap: { flex: 1 },
  headerLogo: { fontFamily: 'serif', color: '#6c4a3d', fontSize: 30, letterSpacing: 0.8 },
  headerSubtitle: { color: '#8f7367', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 2 },
  headerLogoutButton: { borderWidth: 1, borderColor: '#d7b9a7', backgroundColor: '#f8efe8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  headerLogoutText: { color: '#815841', fontWeight: '700', fontSize: 12 },
  content: { padding: 18, paddingTop: 12 },
  profileCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#efe2d8', borderRadius: 10, padding: 18, alignItems: 'center', marginBottom: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f0e0d6', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { color: '#6c4d3d', fontSize: 22, fontWeight: '700' },
  profileName: { color: '#44332d', fontSize: 24, fontWeight: '700', marginBottom: 6 },
  muted: { color: '#7f6c61', fontSize: 14 },
  logoutButton: { marginTop: 18, borderWidth: 1, borderColor: '#d9a89e', backgroundColor: '#fff2ef', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  logoutText: { color: '#9a4c41', fontWeight: '700', fontSize: 15 },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eadacb', backgroundColor: '#fffaf7', paddingVertical: 10, paddingHorizontal: 12 },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  tabDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d7c0b0', marginBottom: 4 },
  tabDotActive: { backgroundColor: '#785647' },
  tabText: { color: '#8c7a70', fontSize: 12 },
  tabTextActive: { color: '#654938', fontWeight: '700' },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  choice: { width: '48%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ebdfd6', borderRadius: 10, padding: 14, marginBottom: 12 },
  choiceActive: { backgroundColor: '#f7efe9', borderColor: '#916e5c' },
  choiceTitle: { fontSize: 15, fontWeight: '700', color: '#56453f' },
  choiceTitleActive: { color: '#5d3d31' },
  choiceSubtitle: { marginTop: 6, color: '#877267', fontSize: 12 },
  choiceSubtitleActive: { color: '#6d4e3f' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 10 },
  sectionNumber: { width: 28, color: '#9d7b67', fontWeight: '700', fontSize: 12 },
  sectionText: { fontSize: 15, fontWeight: '700', color: '#463831' },
  horizontal: { paddingBottom: 8 },
  dateChip: { marginRight: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e7d7cc', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  dateChipActive: { backgroundColor: '#7b5845', borderColor: '#7b5845' },
  dateChipText: { color: '#5a4034', fontWeight: '600' },
  dateChipTextActive: { color: '#fffaf7' },
  times: { flexDirection: 'row', flexWrap: 'wrap' },
  timeChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eadbd1', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  timeChipActive: { backgroundColor: '#7b5845', borderColor: '#7b5845' },
  timeChipText: { color: '#5d463e', fontWeight: '600' },
  timeChipTextActive: { color: '#fffaf7' },
  summary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eadbd1', borderRadius: 10, padding: 16, marginTop: 18 },
  summaryTitle: { color: '#3f312d', fontSize: 18, fontWeight: '700' },
  summaryText: { color: '#6b5a52', marginTop: 6, fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: { color: '#4b3a34', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  appointmentCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eddfd7', borderRadius: 10, padding: 16, marginBottom: 14 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardEyebrow: { color: '#9a705a', fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  cardDate: { color: '#69574f', fontSize: 12 },
  cardTitle: { color: '#453931', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardBody: { color: '#6d5a53', fontSize: 14, marginBottom: 2 },
  cancel: { color: '#a14e46', fontWeight: '700', marginTop: 10 },
});
